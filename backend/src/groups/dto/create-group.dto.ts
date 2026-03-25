import { IsArray, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateGroupDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  key!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantUsernames?: string[];
}
