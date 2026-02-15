import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SetNameServersDto {
  @ApiProperty({ description: 'Name server 1 (ganti name server)' })
  @IsString()
  nameServer1: string;

  @ApiProperty({ description: 'Name server 2 (ganti name server)' })
  @IsString()
  nameServer2: string;
}
