import { Controller, Get, Body, Patch, Param, Delete } from '@nestjs/common';
import { AiAnalyzeService } from './ai-analyze.service';
import { UpdateAiAnalyzeDto } from './dto/update-ai-analyze.dto';

@Controller('ai-analyze')
export class AiAnalyzeController {
  constructor(private readonly aiAnalyzeService: AiAnalyzeService) {}


  @Get()
  findAll() {
    return this.aiAnalyzeService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.aiAnalyzeService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAiAnalyzeDto: UpdateAiAnalyzeDto,
  ) {
    return this.aiAnalyzeService.update(+id, updateAiAnalyzeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.aiAnalyzeService.remove(+id);
  }
  //
  // @Get('analyze/:id')
  // analyzeFeedback(@Param('id') id: string): any {
  //   return this.aiAnalyzeService.analyzeFeedback(id);
  // }
}
