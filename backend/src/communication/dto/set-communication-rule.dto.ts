import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SetCommunicationRuleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  fromUsername!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  toUsername!: string;

  @IsBoolean()
  allowed!: boolean;

  @IsOptional()
  @IsBoolean()
  bidirectional?: boolean;
}
