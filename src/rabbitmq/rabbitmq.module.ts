import { Module } from '@nestjs/common';
import { EmbeddingClientModule } from './embedding-producer/embedding-client.module';
import { AIClientModule } from './ai-producer/ai-client.module';
import { RabbitmqConsumerController } from './rabbitmq.consumer.controller';
import { AiAnalyzeModule } from '../ai-analyze/ai-analyze.module';
import { IngestModule } from '../ingest/ingest.module';

@Module({
  controllers: [RabbitmqConsumerController],
  imports: [
    EmbeddingClientModule,
    AIClientModule,
    AiAnalyzeModule,
    IngestModule,
  ],
})
export class RabbitmqModule {}
