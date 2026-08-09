import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class AiAnalyzeEventProducerService {
  constructor(
    @Inject('RMQ_AIANALYZE_CLIENT') private readonly client: ClientProxy,
  ) {}

  publishAiAnalzyeEvent(payload: any) {
    // @ts-ignore
    this.client.on('error', (err) => {
      console.error('Error occurred while publishing embedding event:', err);
    });
    return this.client.emit('aianalyze_event', payload);
  }

  publishRmqTest(payload: any) {
    return this.client.emit('rmq_test', payload);
  }
}
