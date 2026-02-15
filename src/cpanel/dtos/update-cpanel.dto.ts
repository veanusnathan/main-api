import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCpanelDto {
  @ApiPropertyOptional({ description: 'IP server' })
  @IsOptional()
  @IsString()
  ipServer?: string;

  @ApiPropertyOptional({ description: 'Username' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: 'Password' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: 'Package' })
  @IsOptional()
  @IsString()
  package?: string;

  @ApiPropertyOptional({ description: 'Main domain' })
  @IsOptional()
  @IsString()
  mainDomain?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ description: 'Name server' })
  @IsOptional()
  @IsString()
  nameServer?: string;

  @ApiPropertyOptional({ description: 'Status: Full | Available' })
  @IsOptional()
  @IsString()
  status?: string;
}
