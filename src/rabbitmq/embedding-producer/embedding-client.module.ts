import { ClientsModule, Transport } from '@nestjs/microservices';
import { Module } from '@nestjs/common';
import { EmbeddingEventProducerService } from './embedding-event.producer.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ClientsModule.register([
      {
        name: 'RMQ_EMBEDDING_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost'],
          queue: process.env.RABBITMQ_EMBEDDING_QUEUE || 'embedding',
          queueOptions: {
            durable: true,
          },
          noAck: true,
        },
      },
    ]),
  ],
  exports: [ClientsModule, EmbeddingEventProducerService],
  providers: [EmbeddingEventProducerService],
})
export class EmbeddingClientModule {}
