import {
  BadGatewayException,
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DomainService } from './domain.service';
import { NamecheapConfigService } from './namecheap-config.service';
import { NamecheapService } from './namecheap/namecheap.service';
import { CreateDomainDto } from './dtos/create-domain.dto';
import { UpdateDomainDto } from './dtos/update-domain.dto';
import { SetNameServersDto } from './dtos/set-name-servers.dto';
import { RenewDomainDto } from './dtos/renew-domain.dto';
import { NamecheapConfigDto } from './dtos/namecheap-config.dto';
import { GetDomainsDto } from './dtos/get-domains.dto';
import { NawalaApplyDto } from './dtos/nawala-apply.dto';

@ApiTags('Pendataan Domain')
@Controller('domains')
export class DomainController {
  constructor(
    private readonly domainService: DomainService,
    private readonly namecheapConfigService: NamecheapConfigService,
    private readonly namecheapService: NamecheapService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Daftar domain',
    description:
      'Returns paginated domains. Query params: sortBy, sortOrder, search, status, page (1-based), limit (10|50|100).',
  })
  async findAll(@Query() query: GetDomainsDto) {
    return this.domainService.findAll(query);
  }

  @Get('sync-metadata')
  @ApiOperation({
    summary: 'Get last sync timestamps',
    description: 'Returns last domain sync, name server refresh, and nawala check timestamps (ISO 8601).',
  })
  getSyncMetadata() {
    return this.domainService.getSyncMetadata();
  }

  @Post('sync')
  @ApiOperation({
    summary: 'Domain sync',
    description:
      'Syncs domains from Namecheap (getList) and refreshes name servers via DNS. Can be triggered manually or by a worker.',
  })
  domainSync() {
    return this.domainService.domainSync();
  }

  @Post('bulk-mark-used')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Mark domains as used from .txt file',
    description: 'Upload a .txt file with one domain per line. Matched domains in DB will have isUsed set to true.',
  })
  bulkMarkUsed(
    @UploadedFile() file: { buffer?: Buffer; originalname?: string; mimetype?: string },
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded. Send a .txt file with domain names (one per line).');
    }
    const name = (file.originalname || '').toLowerCase();
    if (!name.endsWith('.txt') && !file.mimetype?.includes('text')) {
      throw new BadRequestException('File must be a .txt file.');
    }
    return this.domainService.bulkMarkUsedFromFile(file.buffer);
  }

  @Post('refresh-ns')
  @ApiOperation({
    summary: 'Refresh name servers via DNS',
    description: 'Updates name server fields for all domains via DNS lookup. Also runs hourly via background worker.',
  })
  refreshNameServers() {
    return this.domainService.runNameServerRefresh();
  }

  @Post('refresh-nawala')
  @ApiOperation({
    summary: 'Refresh nawala (blocked) status for used domains',
    description:
      'Queries Trust Positif for used domains, maps Ada→blocked, Tidak Ada→not blocked, and updates DB.',
  })
  async refreshNawala() {
    try {
      return await this.domainService.refreshNawala();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Trust Positif check failed';
      throw new BadGatewayException(
        `Nawala check failed: ${msg}. The Trust Positif site may be unreachable or blocking requests (e.g. geo-restriction).`,
      );
    }
  }

  @Get('nawala-cron')
  @ApiOperation({
    summary: 'Get used domain names for Nawala cron script',
    description: 'Returns used domain names. Used by scripts/nawala-cron.sh.',
  })
  async getNawalaCronDomains() {
    return { domains: await this.domainService.getUsedDomainNames() };
  }

  @Post('nawala-apply')
  @ApiOperation({
    summary: 'Apply Nawala results from cron script',
    description: 'Accepts Trust Positif results from scripts/nawala-cron.sh. Body: { results: [{ domain, blocked }] }.',
  })
  async applyNawalaFromCron(@Body() dto: NawalaApplyDto) {
    return this.domainService.applyNawalaResultsFromCron(dto.results);
  }

  @Get('namecheap/list')
  @ApiOperation({
    summary: 'Get domain list from Namecheap API (raw getList)',
    description: 'Calls Namecheap getList directly. Useful for testing the Namecheap API integration.',
  })
  getNamecheapList() {
    return this.namecheapService.getList({ pageSize: 100 });
  }

  @Get('namecheap-config')
  @ApiOperation({
    summary: 'Get Namecheap config',
    description: 'Returns the stored Namecheap config (password and api_key masked). Set via PUT or manually in namecheap_config table.',
  })
  getNamecheapConfig() {
    return this.namecheapConfigService.getConfigForDisplay();
  }

  @Put('namecheap-config')
  @ApiOperation({
    summary: 'Set Namecheap config',
    description: 'Store username, password, api key, client IP in DB. Used by all Namecheap API calls.',
  })
  setNamecheapConfig(@Body() dto: NamecheapConfigDto) {
    return this.namecheapConfigService.setConfig(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail domain by id' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.domainService.findOne(id);
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate expired domain via Namecheap' })
  reactivate(@Param('id', ParseIntPipe) id: number) {
    return this.domainService.reactivate(id);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew domain via Namecheap' })
  renew(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RenewDomainDto,
  ) {
    return this.domainService.renew(id, dto.years);
  }

  @Get(':id/info')
  @ApiOperation({ summary: 'Get domain info from Namecheap (getInfo)' })
  getInfo(@Param('id', ParseIntPipe) id: number) {
    return this.domainService.getInfo(id);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah domain (manual)' })
  create(@Body() dto: CreateDomainDto) {
    return this.domainService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update domain',
    description: 'Update name, active, expiry, description, name servers. Description is preserved on sync.',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDomainDto,
  ) {
    return this.domainService.update(id, dto);
  }

  @Patch(':id/name-servers')
  @ApiOperation({ summary: 'Ganti name server' })
  setNameServers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetNameServersDto,
  ) {
    return this.domainService.setNameServers(
      id,
      dto.nameServer1,
      dto.nameServer2,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus domain' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.domainService.remove(id);
  }
}
