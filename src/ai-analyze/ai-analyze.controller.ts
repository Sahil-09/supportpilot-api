import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiAnalyzeService } from './ai-analyze.service';
import { CreateAiAnalyzeDto } from './dto/create-ai-analyze.dto';
import { UpdateAiAnalyzeDto } from './dto/update-ai-analyze.dto';

@Controller('ai-analyze')
export class AiAnalyzeController {
  constructor(private readonly aiAnalyzeService: AiAnalyzeService) {}

  @Post()
  create(@Body() createAiAnalyzeDto: CreateAiAnalyzeDto) {
    return this.aiAnalyzeService.create(createAiAnalyzeDto);
  }

  @Get()
  findAll() {
    return this.aiAnalyzeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiAnalyzeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAiAnalyzeDto: UpdateAiAnalyzeDto) {
    return this.aiAnalyzeService.update(+id, updateAiAnalyzeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiAnalyzeService.remove(+id);
  }
}
