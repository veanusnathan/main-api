import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateWordPressDto {
  @ApiProperty({ description: 'Domain' })
  @IsString()
  domain: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;
}
