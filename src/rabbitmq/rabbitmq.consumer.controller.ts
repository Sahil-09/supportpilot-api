import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload } from '@nestjs/microservices';

@Controller('rabbitmq-consumer')
export class RabbitmqConsumerController {
  @EventPattern('embedding_event')
  async handleEmbeddingEvent(@Payload() data: any, @Ctx() context: any) {
    console.log('Received embedding event:', data);
    // Handle the embedding event here
  }

  @EventPattern('aianalyze_event')
  async handleAiAnalyzeEvent(@Payload() data: any, @Ctx() context: any) {
    console.log('Received AI analyze event:', data);

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    channel.nack(originalMsg, false, false);
    // Handle the AI analyze event here
  }
}
