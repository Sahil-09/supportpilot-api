import { ClientsModule, Transport } from '@nestjs/microservices';
import { Module } from '@nestjs/common';
import { AiAnalyzeEventProducerService } from './ai-analyze-event.producer.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientsModule.register([
      {
        name: 'RMQ_AIANALYZE_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost'],
          queue: process.env.RABBITMQ_AI_QUEUE || 'aianalyze',
          queueOptions: {
            durable: true,
          },
          noAck: true,
        },
      },
    ]),
  ],
  exports: [ClientsModule, AiAnalyzeEventProducerService],
  providers: [AiAnalyzeEventProducerService],
})
export class AIClientModule {}
