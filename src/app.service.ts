import { Injectable } from '@nestjs/common';
import { EmbeddingEventProducerService } from './rabbitmq/embedding-producer/embedding-event.producer.service';
import { AiAnalyzeEventProducerService } from './rabbitmq/ai-producer/ai-analyze-event.producer.service';

@Injectable()
export class AppService {
  constructor(
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

}
