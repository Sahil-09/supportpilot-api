import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload } from '@nestjs/microservices';
import { AiAnalyzeService } from '../ai-analyze/ai-analyze.service';
import { RmqContext } from '@nestjs/microservices/ctx-host/rmq.context';
import { IngestService } from '../ingest/ingest.service';

@Controller('rabbitmq-consumer')
export class RabbitmqConsumerController {
  constructor(
    private aiService: AiAnalyzeService,
    private ingestService: IngestService,
  ) {}

  @EventPattern('embedding_event')
  handleEmbeddingEvent(
    @Payload() data: { docId: string },
    @Ctx() context: RmqContext,
  ) {
    console.log('Received embedding event:', data);
    return this.ingestService.processingDocument(data.docId, context);
    // Handle the embedding event here
  }

  @EventPattern('aianalyze_event')
  handleAiAnalyzeEvent(
    @Payload() data: { feedbackId: string },
    @Ctx() context: RmqContext,
  ) {
    console.log('Received AI analyze event:', data);
    return this.aiService.analyzeFeedback(data.feedbackId, context);
    // Handle the AI analyze event here
  }

  @EventPattern('rmq_test')
  handleRmqTestEvent(
    @Payload() data: { feedbackId: string },
    @Ctx() context: RmqContext,
  ) {
    console.log('Received RMQ event:', data);
    const channel = context.getChannelRef();
    const message = context.getMessage();
    channel.ack(message, false, false);
    // Handle the AI analyze event here
  }
}
