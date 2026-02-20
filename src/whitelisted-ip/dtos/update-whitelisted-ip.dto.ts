import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIP, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

export class UpdateWhitelistedIpDto {
  @ApiPropertyOptional({ example: '192.168.1.1', description: 'IPv4 or IPv6 address' })
  @IsOptional()
  @IsIP(undefined, { message: 'Invalid IP address' })
  ip?: string;

  @ApiPropertyOptional({ example: 'Office network', description: 'Use null to clear' })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  @MaxLength(255)
  description?: string | null;
}
