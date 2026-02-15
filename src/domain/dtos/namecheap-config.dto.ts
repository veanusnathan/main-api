import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class NamecheapConfigDto {
  @ApiProperty({ description: 'Namecheap API User (often same as username)' })
  @IsString()
  apiUser: string;

  @ApiProperty({ description: 'Namecheap account username (UserName in API)' })
  @IsString()
  username: string;

  @ApiPropertyOptional({ description: 'Stored for reference; not sent to Namecheap API' })
  @IsOptional()
  @IsString()
  password?: string | null;

  @ApiProperty({ description: 'Namecheap API Key' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'Client IP whitelisted in Namecheap account' })
  @IsString()
  clientIp: string;

  @ApiPropertyOptional({
    description: 'API base URL (e.g. https://api.sandbox.namecheap.com/xml.response)',
  })
  @IsOptional()
  @IsString()
  baseUrl?: string | null;
}
