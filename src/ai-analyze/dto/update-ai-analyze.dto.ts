import { PartialType } from '@nestjs/mapped-types';
import { CreateAiAnalyzeDto } from './create-ai-analyze.dto';

export class UpdateAiAnalyzeDto extends PartialType(CreateAiAnalyzeDto) {}
