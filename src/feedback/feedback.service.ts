import { Injectable } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AiAnalyzeEventProducerService } from '../rabbitmq/ai-producer/ai-analyze-event.producer.service';
import { Sentiments } from '../../prisma/generated/enums';

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
    return this.prisma.feedback.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        sentiment: true,
        severity: true,
        createdAt: true,
        summarize: true,
        analyze: true,
        replySuggestion: true,
        categorize: true,
      },
    });
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

  async getStat() {
    const allData = await this.prisma.feedback.aggregate({
      _count: { _all: true, analyze: true },
    });
    const positive = await this.prisma.feedback.count({
      where: { sentiment: Sentiments.POSITIVE },
    });
    const negative = await this.prisma.feedback.count({
      where: { sentiment: Sentiments.NEGATIVE },
    });
    const neutral = await this.prisma.feedback.count({
      where: { sentiment: Sentiments.NEUTRAL },
    });
    let estimatedRating = 0;

    if (allData._count._all > 0) {
      const weightedSum =
        positive * 5 + neutral * 3 + negative * 1;

      // Round to 1 decimal place (e.g., 4.3 stars)
      estimatedRating =
        Math.round((weightedSum / allData._count._all) * 10) / 10;
    }
    return {
      total: allData._count._all,
      aiAnalyzed: allData._count.analyze,
      positive,
      negative,
      neutral,
      estimatedRating,
    };
  }
}
