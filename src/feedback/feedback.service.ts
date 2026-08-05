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
    private readonly aiAnalyzeEventService: AiAnalyzeEventProducerService,
  ) {}

  async create(createFeedbackDto: CreateFeedbackDto) {
    const createdFeedback = await this.prisma.feedback.create({
      data: createFeedbackDto,
    });
    this.aiAnalyzeEventService.publishAiAnalzyeEvent({
      feedbackId: createdFeedback.id,
    });
    return { message: 'Feedback created successfully' };
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

}
