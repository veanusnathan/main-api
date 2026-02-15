import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, ValidateIf } from 'class-validator';
import { DomainCategory } from '../domain.entity';

export class UpdateDomainDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Ganti name server 1' })
  @IsOptional()
  @IsString()
  nameServer1?: string;

  @ApiPropertyOptional({ description: 'Ganti name server 2' })
  @IsOptional()
  @IsString()
  nameServer2?: string;

  @ApiPropertyOptional({ description: 'CPanel id to link this domain to; null to unlink' })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsInt()
  cpanelId?: number | null;

  @ApiPropertyOptional({ description: 'Whether domain is in use' })
  @IsOptional()
  @IsBoolean()
  isUsed?: boolean;

  @ApiPropertyOptional({
    description: 'Domain category',
    enum: DomainCategory,
    example: DomainCategory.MS,
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsEnum(DomainCategory)
  category?: DomainCategory | null;
}
