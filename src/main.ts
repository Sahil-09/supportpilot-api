import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:4200',
    credentials: true,
  });
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost'],
      queue: process.env.RABBITMQ_EMBEDDING_QUEUE || 'embedding',
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost'],
      queue: process.env.RABBITMQ_AI_QUEUE || 'aianalyze',
      queueOptions: {
        durable: true,
      },
      noAck: false,
    },
  });
  await app.startAllMicroservices();
  const PORT = process.env.PORT ?? 3300;
  await app.listen(PORT);
  Logger.log(`Server running on port http://localhost:${PORT}/api`);
}
bootstrap();
