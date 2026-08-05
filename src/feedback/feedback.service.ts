import { Injectable } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingEventProducerService } from '../rabbitmq/embedding-producer/embedding-event.producer.service';
import { AiAnalyzeEventProducerService } from '../rabbitmq/ai-producer/ai-analyze-event.producer.service';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eeps: EmbeddingEventProducerService,
    private readonly aips: AiAnalyzeEventProducerService,
  ) {}
  create(createFeedbackDto: any) {
    return this.prisma.feedback.create(createFeedbackDto);
  }

  findAll() {
    return this.prisma.feedback.findMany();
  }

  findOne(id: string) {
    return this.prisma.feedback.findUnique({
      where: { id },
    });
  }

  update(id: number, updateFeedbackDto: UpdateFeedbackDto) {
    return `This action updates a #${id} feedback`;
  }

  remove(id: number) {
    return `This action removes a #${id} feedback`;
  }

  async testRabbitMq() {
    await this.eeps.publishFileEmbeddingEvent({ data: 'test' });
  }

  async testRabbitMqAi() {
    return this.aips.publishAiAnalzyeEvent({ data: 'test' });
  }
}
