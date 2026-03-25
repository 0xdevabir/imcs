import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AddGroupUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username!: string;
}
