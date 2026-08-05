import { Injectable } from '@nestjs/common';
import { CreateAiAnalyzeDto } from './dto/create-ai-analyze.dto';
import { UpdateAiAnalyzeDto } from './dto/update-ai-analyze.dto';

@Injectable()
export class AiAnalyzeService {
  create(createAiAnalyzeDto: CreateAiAnalyzeDto) {
    return 'This action adds a new aiAnalyze';
  }

  findAll() {
    return `This action returns all aiAnalyze`;
  }

  findOne(id: number) {
    return `This action returns a #${id} aiAnalyze`;
  }

  update(id: number, updateAiAnalyzeDto: UpdateAiAnalyzeDto) {
    return `This action updates a #${id} aiAnalyze`;
  }

  remove(id: number) {
    return `This action removes a #${id} aiAnalyze`;
  }
}
