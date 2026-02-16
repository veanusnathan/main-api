import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDomainGroupDto {
  @ApiProperty({ example: 'Production' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Production domains' })
  @IsOptional()
  @IsString()
  description?: string;
}
