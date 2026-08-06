import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateAiAnalyzeDto } from './dto/create-ai-analyze.dto';
import { UpdateAiAnalyzeDto } from './dto/update-ai-analyze.dto';
import { Genkit, RankedDocument, z } from 'genkit';
import { PrismaService } from '../prisma/prisma.service';
import { googleAI } from '@genkit-ai/google-genai';
import { Feedback } from '../../prisma/generated/client';
import { Document } from 'genkit/retriever';
import { AiAnalyzeEventProducerService } from '../rabbitmq/ai-producer/ai-analyze-event.producer.service';
import { RmqContext } from '@nestjs/microservices/ctx-host/rmq.context';

@Injectable()
export class AiAnalyzeService implements OnModuleInit {
  constructor(
    @Inject('GENKIT_AI')
    private readonly ai: Genkit,
    private readonly prismaService: PrismaService,
    private readonly aiAnalyzeEventService: AiAnalyzeEventProducerService,
  ) {}

  onModuleInit(): any {
    if (!this.analyzeFlow) this.analyzeFlow = this.createAnalyzeFlow();
    if (!this.orgData)
      this.orgData = this.ai.defineTool(
        {
          name: 'getOrgData',
          description: 'Gets organization about us data',
          inputSchema: z.object({
            query: z.string().describe('Search query'),
          }),
          outputSchema: z.string().describe('Output query'),
        },
        async (input) => {
          const embedding = await this.ai.embed({
            embedder: googleAI.embedder('gemini-embedding-2'),
            content: input.query,
            options: {
              outputDimensionality: 768, // Reduce from 768 to 384
            },
          });
          const embeddingArray: number[] = embedding[0].embedding;
          const embeddingString = `[${embeddingArray
            .map((v) => {
              const num = Number(v);
              return isFinite(num) ? num : 0;
            })
            .join(',')}]`;
          const sanitizedQuery = input.query.replace(/'/g, "''");
          const vectorQuery = `
           SELECT id, "documentId", content, metadata, "createdAt"
           FROM "document_chunks"
           ORDER BY embedding <=> '${embeddingString}'::vector
           LIMIT 10
         `;
          const keywordQuery = `
           SELECT id, "documentId", content, metadata, "createdAt"
           FROM "document_chunks"
             WHERE to_tsvector('english', content) @@ websearch_to_tsquery('english', '${sanitizedQuery}')
           ORDER BY ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery('english', '${sanitizedQuery}')) DESC
           LIMIT 10
         `;
          const [vectorDocs, keywordDocs] = await Promise.all([
            this.prismaService.$queryRawUnsafe<RankedDocument[]>(vectorQuery),
            this.prismaService.$queryRawUnsafe<RankedDocument[]>(keywordQuery),
          ]);
          this.logger.log(
            `Found ${[vectorDocs, keywordDocs].length} similar documents`,
          );
          return [vectorDocs, keywordDocs]
            .flat()
            .map((el) => el.content)
            .join('\n\n');
        },
      );
    if (!this.categorizeFlow) this.categorizeFlow = this.createCategorizeFlow();
    if (!this.summarizeFlow) this.summarizeFlow = this.createSummarizeFlow();
    if (!this.replySuggestionFlow)
      this.replySuggestionFlow = this.createReplySuggestionFlow();
  }

  private logger = new Logger(AiAnalyzeService.name);
  private analyzeFlow: ReturnType<typeof this.createAnalyzeFlow>;
  private categorizeFlow: ReturnType<typeof this.createCategorizeFlow>;
  private summarizeFlow: ReturnType<typeof this.createSummarizeFlow>;
  private replySuggestionFlow: ReturnType<
    typeof this.createReplySuggestionFlow
  >;
  private orgData: ReturnType<typeof this.ai.defineTool>;
  private targetModel = googleAI.model('gemini-flash-lite-latest');


  findAll() {
    return `This action returns all aiAnalyze`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiAnalyze`;
  }

  update(id: number, updateAiAnalyzeDto: UpdateAiAnalyzeDto) {
    return `This action updates a #${id} aiAnalyze`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiAnalyze`;
  }

  createAnalyzeFlow() {
    const outputSchema = z.object({
      analysis: z.string(),
      sentiments: z.enum(['positive', 'negative', 'neutral']),
      severity: z.enum(['low', 'medium', 'high']),
    });

    return this.ai.defineFlow(
      {
        name: 'feedback-analyze',
        inputSchema: z.string(),
        outputSchema: outputSchema,
      },
      async (input) => {
        const prompt = `Please analyze the following feedback: ${input}`;
        const response = await this.ai.generate({
          model: this.targetModel,
          system: `You are a customer support agent for Veena World (Travel Agency Company).
          
          If you need information about the company, products, policies, mission,
          or services, ALWAYS call the getOrgData tool first before answering.
          
          Do not make assumptions if company information is required.`,
          prompt,
          output: { schema: outputSchema },
          tools: [this.orgData],
        });
        return response.output!;
      },
    );
  }

  createCategorizeFlow() {
    const outputSchema = z.object({
      category: z.enum([
        'Billing',
        'Refund',
        'Account',
        'Authentication',
        'Technical Issue',
        'Enquiry',
        'Feature Request',
        'Complaint',
        'Security',
        'Other',
      ]),
      confidence: z.number(),
    });

    return this.ai.defineFlow(
      {
        name: 'feedback-categorize',
        inputSchema: z.string(),
        outputSchema: outputSchema,
      },
      async (input) => {
        const prompt = `Please categorize the following feedback: ${input}`;
        const response = await this.ai.generate({
          model: this.targetModel,
          system: `You are a customer support agent for Veena World (Travel Agency Company).
          
          Your task is to classify the customer's issue into exactly one category.

          Rules:
          
          - Choose ONLY one category.
          - Never invent new categories.
          - Ignore spelling mistakes.
          - Focus on the customer's primary issue.
          - Return confidence from 0 to 1.
          
          Available Categories:
          
          - Billing
          - Refund
          - Account
          - Enquiry
          - Authentication
          - Technical Issue
          - Feature Request
          - Complaint
          - Security
          - Other`,
          prompt,
          output: { schema: outputSchema },
          tools: [this.orgData],
        });
        return response.output!;
      },
    );
  }

  createSummarizeFlow() {
    const outputSchema = z.object({
      summary: z.string(),
      embedded: z.array(z.number()),
    });

    return this.ai.defineFlow(
      {
        name: 'feedback-summarize',
        inputSchema: z.string(),
        outputSchema: outputSchema,
      },
      async (input) => {
        const prompt = `Please summarize the following feedback: ${input}`;
        const generateOutputSchema = z.object({
          summary: z.string(),
        });
        const response = await this.ai.generate({
          model: this.targetModel,
          system: `You are a customer support agent for Veena World (Travel Agency Company).
          
          Summarize the customer's primary issue.

          Rules:
          - Maximum 20 words.
          - Focus only on the main problem.
          - Do not include greetings or signatures.
          - Do not suggest a solution.
          - Return plain text only.`,
          prompt,
          output: { schema: generateOutputSchema },
          tools: [this.orgData],
        });
        const summary: string = response.output?.summary || '';
        this.logger.log('Summary generated, creating embedding for storage');
        let embedded: any;
        if (summary) {
          embedded = await this.ai.embed({
            embedder: googleAI.embedder('gemini-embedding-2'),
            content: summary,
            options: {
              outputDimensionality: 768, // Reduce from 768 to 384
            },
          });
          this.logger.log('Embedding created, proceeding to store in database');
        }
        return { summary, embedded: embedded?.[0]?.embedding || [] };
      },
    );
  }

  createReplySuggestionFlow() {
    const dataRetriever = this.ai.defineRetriever(
      {
        name: 'similar-feedback-retriever',
        configSchema: z.object({
          query: z.string(),
          k: z.number(),
        }),
      },
      async (input, options) => {
        const embedding = await this.ai.embed({
          embedder: googleAI.embedder('gemini-embedding-2'),
          content: options.query,
          options: {
            outputDimensionality: 768, // Reduce from 768 to 384
          },
        });
        const embeddingArray: number[] = embedding[0].embedding;
        const embeddingString = `[${embeddingArray
          .map((v) => {
            const num = Number(v);
            return isFinite(num) ? num : 0;
          })
          .join(',')}]`;
        const similarFeedbackQuery = `
       SELECT id, "feedBackText", "replySuggestion"
       FROM "feedbacks"
       ORDER BY embedding <=> '${embeddingString}'::vector
       LIMIT ${options.k}
     `;
        const similarFeedbacks =
          await this.prismaService.$queryRawUnsafe<Feedback[]>(
            similarFeedbackQuery,
          );
        const formatedDoc = similarFeedbacks
          .filter((el) => !!el.replySuggestion)
          .map((row) => {
            const { replySuggestion } = row;
            return Document.fromText(replySuggestion || '');
          });
        return {
          documents: formatedDoc,
        };
      },
    );
    return this.ai.defineFlow(
      {
        name: 'reply-suggestion',
        inputSchema: z.string(),
        outputSchema: z.object({
          suggestion: z.string(),
        }),
      },
      async (input) => {
        const similarData = await this.ai.retrieve({
          retriever: dataRetriever,
          query: input,
          options: {
            query: input,
            k: 10,
          },
        });
        this.logger.log(
          `Found ${similarData.length} similar feedbacks, proceeding to generate reply suggestion`,
        );
        const prompt = `Please suggest a reply to the following customer feedback based on the retrieved similar feedbacks.
        Feedback:${input}`;
        const response = await this.ai.generate({
          model: this.targetModel,
          system: `You are an AI customer support assistant.
          
          Your job is to draft a reply that a human support agent can review before sending.
          If you need information about the company, products, policies, mission,
          or services, ALWAYS call the getOrgData tool first before answering.
          Rules:
          
          - Be professional and empathetic.
          - Do not invent company policies.
          - Use only the provided knowledge base and previous resolutions.
          - If the answer cannot be determined, clearly state that additional investigation is required.
          - Never promise refunds, discounts, or compensation unless supported by the provided information.
          - Avoid repeating the customer's message.
          - Keep the response concise.
          - End by inviting the customer to reply if they need additional assistance.
          `,
          prompt,
          output: {
            schema: z.object({
              suggestion: z.string(),
            }),
          },
          tools: [this.orgData],
          docs: similarData,
        });
        this.logger.log(
          `Reply suggestion generated, proceeding to store in database`,
        );
        return response?.output!;
      },
    );
  }

  async analyzeFeedback(feedbackId: string, context: RmqContext): Promise<any> {
    const feedbackData: Feedback = await this.prismaService.feedback.findUniqueOrThrow({
      where: { id: feedbackId },
    });
    if (!feedbackData) {
      return;
    }
    const feedbackText: string = feedbackData?.feedBackText || '';

    this.logger.log('Fetched feedback message, proceeding with Analysis');
    const analyze = await this.analyzeFlow.run(feedbackText);
    this.logger.log(
      'Analysis completed, proceeding with Categorization and Summarization',
    );
    const categorize = await this.categorizeFlow.run(feedbackText);
    this.logger.log('Categorization completed, proceeding with Summarization');
    const summarize = await this.summarizeFlow.run(feedbackText);
    if (analyze || categorize || summarize) {
      this.logger.log(
        'Analysis, Categorization, and Summarization completed, proceeding to store results in database',
      );
      await this.prismaService.feedback.update({
        where: { id: feedbackId },
        data: {
          analyze: JSON.stringify(analyze.result),
          categorize: JSON.stringify(categorize.result),
          summarize: summarize.result.summary,
        },
      });
      if (summarize?.result?.embedded) {
        const embeddingString = `[${summarize.result.embedded
          .map((v) => {
            const num = Number(v);
            return isFinite(num) ? num : 0;
          })
          .join(',')}]`;
        const updateQuery = `UPDATE feedbacks SET "embedding" = '${embeddingString}'::vector WHERE "id" = '${feedbackId}'`;
        this.logger.log('Storing embedding in database');
        await this.prismaService.$executeRawUnsafe(updateQuery);
      }
    }
    this.logger.log('Publish Reply Suggestion Event');
    this.aiAnalyzeEventService.publishAiReplySuggestionEvent({
      feedbackId: feedbackId,
    });
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg, false, false);
    return { analyze, categorize, summarize };
  }

  async suggestReply(feedbackId: string, context: RmqContext): Promise<any> {
    const feedbackData: any = await this.prismaService.feedback.findUnique({
      where: { id: feedbackId },
    });
    const feedbackText: string = feedbackData?.feedBackText || '';
    if (!feedbackText) {
      return;
    }
    const replySuggestion = await this.replySuggestionFlow.run(feedbackText);
    if (replySuggestion) {
      await this.prismaService.feedback.update({
        where: { id: feedbackId },
        data: {
          replySuggestion: replySuggestion.result.suggestion,
        },
      });
    }
    this.logger.log('Reply Suggestion completed, and store in database');
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.ack(originalMsg, false, false);
    return replySuggestion;
  }
}
