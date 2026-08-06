import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AIClientModule } from '../rabbitmq/ai-producer/ai-client.module';
import { EmbeddingClientModule } from '../rabbitmq/embedding-producer/embedding-client.module';

@Module({
  imports:[PrismaModule,AIClientModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}
