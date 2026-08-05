import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors, UploadedFile, UploadedFiles,
} from '@nestjs/common';
import { IngestService } from './ingest.service';
import { CreateIngestDto } from './dto/create-ingest.dto';
import { UpdateIngestDto } from './dto/update-ingest.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Post()
  create(@Body() createIngestDto: CreateIngestDto) {
    return this.ingestService.create(createIngestDto);
  }

  @Get()
  findAll() {
    return this.ingestService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ingestService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateIngestDto: UpdateIngestDto) {
    return this.ingestService.update(+id, updateIngestDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ingestService.remove(+id);
  }

  @Post('addDocument')
  @UseInterceptors(FilesInterceptor('files'))
  addDocument(@UploadedFiles() files: Express.Multer.File[]) {
    return this.ingestService.addDocument(files,'null');
  }
}
