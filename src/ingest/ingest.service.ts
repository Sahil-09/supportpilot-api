import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateIngestDto } from './dto/create-ingest.dto';
import { UpdateIngestDto } from './dto/update-ingest.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Genkit, z } from 'genkit';
import { PDFParse } from 'pdf-parse';
import { chunk } from 'llm-chunk';
import { Document } from 'genkit/retriever';
import { googleAI } from '@genkit-ai/google-genai';
import { DocumentChunk } from '../../prisma/generated/client';

@Injectable()
export class IngestService implements OnModuleInit {
  constructor(
    private readonly prismaService: PrismaService,
    @Inject('GENKIT_AI')
    private readonly ai: Genkit,
  ) {}
  private logger = new Logger(IngestService.name);
  private ingestDataFlow: ReturnType<typeof this.ingestData>;
  onModuleInit(): any {
    this.ingestDataFlow = this.ingestData();
  }

  create(createIngestDto: CreateIngestDto) {
    return 'This action adds a new ingest';
  }

  findAll() {
    return `This action returns all ingest`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ingest`;
  }

  update(id: number, updateIngestDto: UpdateIngestDto) {
    return `This action updates a #${id} ingest`;
  }

  remove(id: number) {
    return `This action removes a #${id} ingest`;
  }

  sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  async addDocument(files: Express.Multer.File[], userId: string) {
    const result: any[] = [];
    for (const file of files) {
      const pdfText = await this.extractTextFromPdf(file.buffer);
      const createdDoc = await this.prismaService.document.create({
        data: {
          uploadedBy: userId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          extractedText: pdfText.text,
          fileUrl: file.originalname,
        },
      });
      this.logger.log(
        `Created ${file.originalname} document with ID: ${createdDoc.id} by user: ${userId}`,
      );
      try {
        await this.ingestDataFlow.run({
          file: file,
          docId: createdDoc.id,
          pdfText: pdfText.text,
        });
        this.logger.log(
          `Ingested data for document: ${createdDoc.id} - ${file.originalname}`,
        );
        await this.prismaService.document.update({
          where: { id: createdDoc.id },
          data: { processingStatus: 'COMPLETED' },
        });
        await this.sleep(5000); // Delay for 5 seconds
        result.push({
          message: 'Success',
          documentId: createdDoc.id,
        });
      } catch (e) {
        this.logger.error(
          `Error occurred while ingesting document: ${createdDoc.id} - ${file.originalname}`,
          e,
        );
        await this.prismaService.document.update({
          where: { id: createdDoc.id },
          data: { processingStatus: 'FAILED' },
        });
        result.push({
          message: 'Failed',
          documentId: createdDoc.id,
        });
      }
    }
    return result;
  }
  async extractTextFromPdf(buffer: Buffer) {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result;
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
          file: z.object({
            buffer: z.instanceof(Buffer),
            originalname: z.string(),
          }),
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
        const formatedChunks = chunks.map((text) => {
          return Document.fromText(text, {
            meta: { fileName: input.file.originalname },
          });
        });
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
