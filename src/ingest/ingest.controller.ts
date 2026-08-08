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

  @Post('addDocument')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FilesInterceptor('files'))
  addDocument(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: { user: { userId: string } },
  ) {
    return this.ingestService.addDocument(files, req.user.userId);
  }

  @Get('getDocument/:id')
  getDocument(@Param('id') id: string) {
    return this.ingestService.getDocumentUrl(id);
  }
}
