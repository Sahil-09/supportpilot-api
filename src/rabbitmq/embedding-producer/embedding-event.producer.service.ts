import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class EmbeddingEventProducerService {
  constructor(
    @Inject('RMQ_EMBEDDING_CLIENT') private readonly client: ClientProxy,
  ) {}

  async publishFileEmbeddingEvent(payload:any){
    // @ts-ignore
    this.client.on('error', (err) => {
      console.error('Error occurred while publishing embedding event:', err);
    });
    console.log("hits");
    return this.client.emit('embedding_event', payload);
  }
}
