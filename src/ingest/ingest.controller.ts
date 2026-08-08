import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  Req,
} from '@nestjs/common';
import { IngestService } from './ingest.service';
import { CreateIngestDto } from './dto/create-ingest.dto';
import { UpdateIngestDto } from './dto/update-ingest.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';

@Controller('ingest')
export class IngestController {
  constructor(private readonly ingestService: IngestService) {}

  @Get('documents')
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
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FilesInterceptor('files'))
  addDocument(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: { user: { userId: string } },
  ) {
    return this.ingestService.addDocument(files, req.user.userId);
  }

  @Post('addDocumentV2')
  @UseInterceptors(FilesInterceptor('files'))
  addDocumentV2(@UploadedFiles() files: Express.Multer.File[]) {
    return this.ingestService.addDocumentV2(files, 'null');
  }
}
