import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class EmbeddingEventProducerService {
  constructor(
    @Inject('RMQ_EMBEDDING_CLIENT') private readonly client: ClientProxy,
  ) {}

  publishFileEmbeddingEvent(payload: any) {
    return this.client.emit('embedding_event', payload);
  }
}
