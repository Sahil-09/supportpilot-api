import { Module } from '@nestjs/common';
import { AiAnalyzeService } from './ai-analyze.service';
import { AiAnalyzeController } from './ai-analyze.controller';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AIClientModule } from '../rabbitmq/ai-producer/ai-client.module';

@Module({
  imports: [AiModule, PrismaModule,AIClientModule],
  controllers: [AiAnalyzeController],
  providers: [AiAnalyzeService],
  exports: [AiAnalyzeService]
})
export class AiAnalyzeModule {}
