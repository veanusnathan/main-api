import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { DomainCategory } from '../domain.entity';

export class CreateDomainDto {
  @ApiProperty({ example: 'example.com' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ example: '2026-12-31' })
  @IsDateString()
  expiryDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Name server 1 (ganti name server)' })
  @IsOptional()
  @IsString()
  nameServer1?: string;

  @ApiPropertyOptional({ description: 'Name server 2 (ganti name server)' })
  @IsOptional()
  @IsString()
  nameServer2?: string;

  @ApiPropertyOptional({ description: 'Whether domain is in use', default: false })
  @IsOptional()
  @IsBoolean()
  isUsed?: boolean;

  @ApiPropertyOptional({
    description: 'Domain category',
    enum: DomainCategory,
    example: DomainCategory.MS,
  })
  @IsOptional()
  @IsEnum(DomainCategory)
  category?: DomainCategory | null;
}
