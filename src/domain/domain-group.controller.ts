import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DomainGroupService } from './domain-group.service';
import { CreateDomainGroupDto } from './dtos/create-domain-group.dto';
import { UpdateDomainGroupDto } from './dtos/update-domain-group.dto';

@ApiTags('Pendataan Domain')
@Controller('domains/groups')
export class DomainGroupController {
  constructor(private readonly domainGroupService: DomainGroupService) {}

  @Get()
  @ApiOperation({ summary: 'List domain groups' })
  findAll() {
    return this.domainGroupService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get domain group by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.domainGroupService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create domain group' })
  create(@Body() dto: CreateDomainGroupDto) {
    return this.domainGroupService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update domain group' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDomainGroupDto,
  ) {
    return this.domainGroupService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete domain group' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.domainGroupService.remove(id);
  }
}
