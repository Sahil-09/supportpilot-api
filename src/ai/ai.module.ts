import { Module } from '@nestjs/common';
import { AiProvider } from './ai.provider';

@Module({
  providers: [AiProvider],
  exports:[AiProvider]
})
export class AiModule {}
