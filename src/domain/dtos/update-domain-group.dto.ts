import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateDomainGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Use null or empty to clear the description' })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  description?: string | null;
}
