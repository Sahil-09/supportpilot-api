import { Module } from '@nestjs/common';
import { AiAnalyzeService } from './ai-analyze.service';
import { AiAnalyzeController } from './ai-analyze.controller';

@Module({
  controllers: [AiAnalyzeController],
  providers: [AiAnalyzeService],
})
export class AiAnalyzeModule {}
