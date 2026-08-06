import { IsString } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  feedBackText: string;

  @IsString()
  from: string;
}
