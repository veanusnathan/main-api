import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NawalaResultItemDto {
  @ApiProperty({ example: 'example.com' })
  @IsString()
  domain: string;

  @ApiProperty({ description: 'true = blocked (Ada), false = not blocked', example: false })
  @IsBoolean()
  blocked: boolean;
}

export class NawalaApplyDto {
  @ApiProperty({ description: 'Must match NAWALA_CRON_SECRET' })
  @IsString()
  secret: string;

  @ApiProperty({ type: [NawalaResultItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NawalaResultItemDto)
  results: Array<{ domain: string; blocked: boolean }>;
}
