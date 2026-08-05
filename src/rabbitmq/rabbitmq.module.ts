import { Module } from '@nestjs/common';
import { EmbeddingClientModule } from './embedding-producer/embedding-client.module';
import { AIClientModule } from './ai-producer/ai-client.module';
import { RabbitmqConsumerController } from './rabbitmq.consumer.controller';

@Module({
  controllers: [RabbitmqConsumerController],
  imports: [EmbeddingClientModule, AIClientModule],
})
export class RabbitmqModule {}
