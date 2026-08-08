import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { IngestController } from './ingest.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { IngestGateway } from './ingest.gateway';
import { MinioService } from './minio.service';
import { EmbeddingClientModule } from '../rabbitmq/embedding-producer/embedding-client.module';

@Module({
  imports: [PrismaModule, AiModule, EmbeddingClientModule],
  controllers: [IngestController],
  providers: [IngestService, IngestGateway, MinioService],
  exports: [IngestService],
})
export class IngestModule {}
