import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CpanelService } from './cpanel.service';
import { CreateCpanelDto } from './dtos/create-cpanel.dto';
import { UpdateCpanelDto } from './dtos/update-cpanel.dto';
import { GetDomainsDto } from '../domain/dtos/get-domains.dto';
import { DomainService } from '../domain/domain.service';

@ApiTags('CPanel Data')
@Controller('cpanel')
export class CpanelController {
  constructor(
    private readonly cpanelService: CpanelService,
    private readonly domainService: DomainService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all CPanel data' })
  findAll() {
    return this.cpanelService.findAll();
  }

  @Get(':id/domains')
  @ApiOperation({ summary: 'List domains linked to this CPanel (same filters as /domains)' })
  findDomains(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: GetDomainsDto,
  ) {
    return this.domainService.findAll({ ...query, cpanelId: id });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get CPanel data by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cpanelService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create CPanel data' })
  create(@Body() dto: CreateCpanelDto) {
    return this.cpanelService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update CPanel data' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCpanelDto,
  ) {
    return this.cpanelService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete CPanel data' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cpanelService.remove(id);
  }
}
