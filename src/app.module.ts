import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FeedbackModule } from './feedback/feedback.module';
import { IngestModule } from './ingest/ingest.module';
import { AiModule } from './ai/ai.module';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';
import { AiAnalyzeModule } from './ai-analyze/ai-analyze.module';

@Module({
  imports: [
    PrismaModule,
    FeedbackModule,
    IngestModule,
    AiModule,
    ConfigModule.forRoot(),
    RabbitmqModule,
    AiAnalyzeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
