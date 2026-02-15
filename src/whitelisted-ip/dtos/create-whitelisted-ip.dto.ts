import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIP, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWhitelistedIpDto {
  @ApiProperty({ example: '192.168.1.1', description: 'IPv4 or IPv6 address' })
  @IsIP(undefined, { message: 'Invalid IP address' })
  ip: string;

  @ApiPropertyOptional({ example: 'Office network' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
