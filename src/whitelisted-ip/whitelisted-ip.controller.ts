import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhitelistedIpService } from './whitelisted-ip.service';
import { CreateWhitelistedIpDto } from './dtos/create-whitelisted-ip.dto';
import { UpdateWhitelistedIpDto } from './dtos/update-whitelisted-ip.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Whitelisted IPs')
@Controller('whitelisted-ips')
@UseGuards(RolesGuard)
@Roles('superuser')
export class WhitelistedIpController {
  constructor(private readonly service: WhitelistedIpService) {}

  @Get()
  @ApiOperation({ summary: 'List whitelisted IPs (superuser only)' })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Add whitelisted IP (superuser only)' })
  create(@Body() dto: CreateWhitelistedIpDto) {
    return this.service.create(dto.ip, dto.description);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update whitelisted IP (superuser only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWhitelistedIpDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove whitelisted IP (superuser only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
