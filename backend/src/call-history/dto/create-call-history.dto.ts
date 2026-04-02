import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

const CALL_TYPES = ['voice', 'video'] as const;
const CALL_STATUSES = ['missed', 'completed', 'incoming', 'outgoing', 'rejected'] as const;

export class CreateCallHistoryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  peerUserId!: number;

  @IsString()
  @IsNotEmpty()
  peerUsername!: string;

  @IsString()
  @IsIn(CALL_TYPES)
  callType!: string;

  @IsString()
  @IsIn(CALL_STATUSES)
  callStatus!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  duration!: number;

  @IsString()
  @IsNotEmpty()
  roomKey!: string;
}
