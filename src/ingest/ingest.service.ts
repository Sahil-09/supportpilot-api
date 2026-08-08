import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { UpdateIngestDto } from './dto/update-ingest.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Genkit, z } from 'genkit';
import { chunk } from 'llm-chunk';
import { Document } from 'genkit/retriever';
import { googleAI } from '@genkit-ai/google-genai';
import { DocumentChunk } from '../../prisma/generated/client';
import { IngestGateway } from './ingest.gateway';
import LlamaCloud, { toFile } from '@llamaindex/llama-cloud';
import { MinioService } from './minio.service';
import { EmbeddingEventProducerService } from '../rabbitmq/embedding-producer/embedding-event.producer.service';
import { RmqContext } from '@nestjs/microservices/ctx-host/rmq.context';

@Injectable()
export class IngestService implements OnModuleInit {
  private logger = new Logger(IngestService.name);
  private ingestDataFlow: ReturnType<typeof this.ingestData>;
  private parser: LlamaCloud;

  constructor(
    private readonly prismaService: PrismaService,
    @Inject('GENKIT_AI')
    private readonly ai: Genkit,
    private readonly ingestGateway: IngestGateway,
    private readonly minioService: MinioService,
    private readonly embeddingEventProducer: EmbeddingEventProducerService,
  ) {}

  onModuleInit(): any {
    this.ingestDataFlow = this.ingestData();
    this.parser = new LlamaCloud({
      apiKey: process.env.LLMP_API_KEY,
    });
  }

  findAll() {
    return this.prismaService.document.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        user: { select: { fullName: true } },
        processingStatus: true,
        createdAt: true,
      },
    });
  }

  async getDocumentUrl(id) {
    const docData = await this.prismaService.document.findUnique({
      where: { id: id },
    });
    if (!docData?.fileName) {
      throw new Error('FileName not found');
    }
    const url = await this.minioService.getObjectUrl(docData?.fileName);
    return { url };
  }

  sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async addDocument(files: Express.Multer.File[], userId: string) {
    for (const file of files) {
      await this.minioService.putBufferObject(file);
      const createdDoc = await this.prismaService.document.create({
        data: {
          uploadedBy: userId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          processingStatus: 'PENDING',
        },
      });
      this.logger.log(
        `Created ${file.originalname} document with ID: ${createdDoc.id} by user: ${userId}`,
      );
      this.embeddingEventProducer.publishFileEmbeddingEvent({
        docId: createdDoc.id,
      });
    }
    return { message: 'Files Uploaded' };
  }

  async processingDocument(docId: string, context: RmqContext) {
    const docData = await this.prismaService.document.findUnique({
      where: { id: docId },
    });
    if (!docData?.fileName) {
      throw new Error(`File name not found for document ID: ${docId}`);
    }
    try {
      const pdfText = await this.extractTextFromFile(
        docData.fileName,
        docData.mimeType || '',
        docId,
      );
      this.ingestGateway.emitUploadProgress({
        percentage: 1,
        status: 'PROCESSING',
        id: docId,
        embedded: 0,
        totalEmbed: 0,
      });
      await this.ingestDataFlow.run({
        fileName: docData.fileName,
        docId: docId,
        pdfText: pdfText,
      });
      this.logger.log(
        `Ingested data for document: ${docId} - ${docData?.fileName}`,
      );
      await this.prismaService.document.update({
        where: { id: docId },
        data: { processingStatus: 'COMPLETED' },
      });
      this.ingestGateway.emitUploadProgress({
        percentage: 100,
        status: 'COMPLETED',
        id: docId,
        embedded: 0,
        totalEmbed: 0,
      });
      await this.sleep(5000); // Delay for 5 seconds
      const channel = context.getChannelRef();
      const message = context.getMessage();
      channel.ack(message, false, false);
    } catch (e) {
      this.logger.error(
        `Error occurred while ingesting document: ${docId} - ${docData?.fileName}`,
        e,
      );
      this.ingestGateway.emitUploadProgress({
        percentage: 0,
        status: 'FAILED',
        id: docId,
        embedded: 0,
        totalEmbed: 0,
      });
      await this.prismaService.document.update({
        where: { id: docId },
        data: { processingStatus: 'FAILED' },
      });
    }
  }

  async extractTextFromFile(filename: string, mimeType: string, docId: string) {
    if (!filename) {
      throw new Error(`File name not found for document ID: ${docId}`);
    }
    const fileUrl = await this.minioService.getObjectUrl(filename);
    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch file from S3: ${response.statusText}`);
    }

    // 2. Convert response to a Node Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadableFile = await toFile(buffer, filename, {
      type: mimeType,
    });
    const fileObj = await this.parser.files.create({
      file: uploadableFile,
      purpose: 'parse',
    });
    const result = await this.parser.parsing.parse({
      file_id: fileObj.id,
      tier: 'fast',
      version: 'latest',
      // expand: which fields to materialize (markdown_full, text_full, items, *_content_metadata, ...)
      expand: ['markdown_full'],
    });
    await this.parser.files.delete(fileObj.id);
    await this.prismaService.document.update({
      where: { id: docId },
      data: { extractedText: result.markdown_full || '' },
    });
    return result.markdown_full || '';
  }

  async embedSingleChunkWithRetry(
    chunkText: string,
    retries = 3,
  ): Promise<number[]> {
    try {
      const response = await this.ai.embed({
        embedder: googleAI.embedder('gemini-embedding-2'),
        content: chunkText,
        options: {
          outputDimensionality: 768, // Reduce from 768 to 384
        },
      });
      return response[0].embedding;
    } catch (error: any) {
      // If we hit HTTP 429 Rate Limit, trigger exponential backoff
      if (
        (error.status === 429 || error.message?.includes('429')) &&
        retries > 0
      ) {
        const waitTime = (4 - retries) * 60000; // 2s, 4s, 6s...
        console.warn(`Rate limited. Retrying chunk in ${waitTime}ms...`);
        await this.sleep(waitTime);
        return this.embedSingleChunkWithRetry(chunkText, retries - 1);
      }
      throw error;
    }
  }

  ingestData() {
    const chunkingConfig: any = {
      minLength: 600,
      maxLength: 1000,
      splitter: 'sentence',
      overlap: 50,
      delimiters: '',
    };

    return this.ai.defineFlow(
      {
        name: 'ingestData',
        inputSchema: z.object({
          fileName: z.string(),
          docId: z.string(),
          pdfText: z.string(),
        }),
        outputSchema: z.object({
          success: z.boolean(),
          chunksIndexed: z.number(),
          error: z.string().optional(),
        }),
      },
      async (input) => {
        // Divide the pdf text into segments
        const chunks = chunk(input.pdfText, chunkingConfig);
        let percentage = 3;
        this.ingestGateway.emitUploadProgress({
          percentage,
          status: 'PROCESSING',
          id: input.docId,
          embedded: 0,
          totalEmbed: chunks.length,
        });
        const formatedChunks = chunks.map((text) => {
          return Document.fromText(text, {
            meta: { fileName: input.fileName },
          });
        });
        percentage = 5;
        this.ingestGateway.emitUploadProgress({
          percentage,
          status: 'PROCESSING',
          id: input.docId,
          embedded: 0,
          totalEmbed: chunks.length,
        });
        let basePercentage = percentage;
        const remainingRange = 100 - basePercentage;
        const totalChunks = formatedChunks.length; // 95
        await this.prismaService.document.update({
          where: { id: input.docId },
          data: { chunksNo: formatedChunks.length },
        });
        let i: number = 0;
        for (const el of formatedChunks) {
          const createDocChunk: DocumentChunk =
            await this.prismaService.documentChunk.create({
              data: {
                documentId: input.docId,
                content: el.text,
                metadata: el.metadata,
              },
            });
          this.logger.log(
            `Embedded: ${i}/${formatedChunks.length} for document: ${input.docId}`,
          );
          const embeddingArray = await this.embedSingleChunkWithRetry(
            el.text,
            3,
          );
          const embeddingString = `[${embeddingArray
            .map((v) => {
              const num = Number(v);
              return isFinite(num) ? num : 0;
            })
            .join(',')}]`;
          const updateQuery = `UPDATE "document_chunks" SET "embedding" = '${embeddingString}'::vector WHERE "id" = '${createDocChunk.id}'`;
          await this.prismaService.$executeRawUnsafe(updateQuery);
          await this.sleep(200); // Delay for 600ms to avoid rate limiting
          const chunkProgress = (i / totalChunks) * remainingRange;
          percentage = Math.min(
            100,
            Math.round(basePercentage + chunkProgress),
          );
          this.ingestGateway.emitUploadProgress({
            percentage,
            status: 'PROCESSING',
            id: input.docId,
            embedded: i,
            totalEmbed: chunks.length,
          });
          i++;
        }
        this.logger.log(
          `Embedded: ${i}/${formatedChunks.length} for document: ${input.docId}`,
        );
        return {
          success: true,
          chunksIndexed: formatedChunks.length,
        };
      },
    );
  }
}
