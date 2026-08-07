import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload } from '@nestjs/microservices';
import { AiAnalyzeService } from '../ai-analyze/ai-analyze.service';
import { RmqContext } from '@nestjs/microservices/ctx-host/rmq.context';

@Controller('rabbitmq-consumer')
export class RabbitmqConsumerController {
  constructor(private aiService: AiAnalyzeService) {}

  @EventPattern('embedding_event')
  handleEmbeddingEvent(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Received embedding event:', data);
    // Handle the embedding event here
  }

  @EventPattern('aianalyze_event')
  handleAiAnalyzeEvent(@Payload() data: any, @Ctx() context: RmqContext) {
    console.log('Received AI analyze event:', data);
    return this.aiService.analyzeFeedback(data.feedbackId, context);

    // Handle the AI analyze event here
  }

}
