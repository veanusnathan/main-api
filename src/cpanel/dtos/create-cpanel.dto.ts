import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCpanelDto {
  @ApiProperty({ description: 'IP server' })
  @IsString()
  ipServer: string;

  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;

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
