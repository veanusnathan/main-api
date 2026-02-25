import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { resolve as dnsResolve } from 'node:dns/promises';
import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityRepository, wrap } from '@mikro-orm/core';
import type { EntityManager } from '@mikro-orm/postgresql';
import { DomainRepository } from './domain.repository';
import { Domain } from './domain.entity';
import { DomainGroup } from './domain-group.entity';
import { SyncLog, SyncServiceName } from './sync-log.entity';
import { CpanelData } from '../cpanel/cpanel.entity';
import { NamecheapService } from './namecheap/namecheap.service';
import { TrustPositifService } from './trust-positif/trust-positif.service';
import { CreateDomainDto } from './dtos/create-domain.dto';
import { UpdateDomainDto } from './dtos/update-domain.dto';
import type { GetDomainsDto } from './dtos/get-domains.dto';

/** Fetch NS records via DNS lookup (same as DNS checker tools) */
async function lookupNameservers(domain: string): Promise<string[]> {
  try {
    const records = await dnsResolve(domain, 'NS');
    return (records as string[] ?? []).map((r) => String(r).replace(/\.$/, ''));
  } catch {
    return [];
  }
}

/** Parse Namecheap Expires (MM/DD/YYYY) to Date */
function parseExpires(expires: string): Date {
  const [mm, dd, yyyy] = expires.split('/').map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  if (isNaN(d.getTime())) throw new Error(`Invalid expires date: ${expires}`);
  return d;
}

/** Format Date to MM/DD/YYYY for backoffice */
function formatExpires(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
}

/** Paginated list response */
export interface PaginatedDomainResponse {
  data: DomainResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** Backoffice list/detail shape */
export interface DomainResponse {
  id: string;
  name: string;
  user?: string;
  created?: string;
  expires: string;
  isExpired: boolean;
  isLocked: boolean;
  autoRenew: boolean;
  whoisGuard?: string;
  isPremium?: boolean;
  isOurDNS?: boolean;
  description?: string | null;
  nameServers: string[];
  nawala: boolean;
  isUsed: boolean;
  category?: string | null;
  isDefense: boolean;
  isLinkAlt: boolean;
  group?: {
    id: number;
    name: string;
    description: string | null;
  } | null;
  cpanel?: {
    id: number;
    ipServer: string;
    username: string;
    mainDomain?: string | null;
  } | null;
}

function toResponse(domain: Domain): DomainResponse {
  const nameServers = [domain.nameServer1, domain.nameServer2].filter(
    (s): s is string => s != null && s !== '',
  );

  let groupData = null;
  if (domain.group) {
    const g = domain.group;
    const wrapped = wrap(g);
    if (wrapped.isInitialized() || (g.id && g.name)) {
      groupData = {
        id: g.id,
        name: g.name,
        description: g.description ?? null,
      };
    }
  }

  // Map cpanel relation if it exists and is loaded
  let cpanelData = null;
  if (domain.cpanel) {
    const cpanel = domain.cpanel;
    const wrapped = wrap(cpanel);
    if (wrapped.isInitialized() || (cpanel.id && cpanel.username && cpanel.ipServer)) {
      cpanelData = {
        id: cpanel.id,
        ipServer: cpanel.ipServer,
        username: cpanel.username,
        mainDomain: cpanel.mainDomain ?? null,
      };
    }
  }

  return {
    id: String(domain.id),
    name: domain.name,
    user: domain.user ?? undefined,
    created: domain.created ?? undefined,
    expires: formatExpires(domain.expiryDate),
    isExpired: domain.isExpired,
    isLocked: domain.isLocked,
    autoRenew: domain.autoRenew,
    whoisGuard: domain.whoisGuard ?? undefined,
    isPremium: domain.isPremium ?? undefined,
    isOurDNS: domain.isOurDns ?? undefined,
    description: domain.description,
    nameServers,
    nawala: domain.nawala ?? false,
    isUsed: domain.isUsed ?? false,
    category: domain.category ?? null,
    isDefense: domain.isDefense ?? false,
    isLinkAlt: domain.isLinkAlt ?? false,
    group: groupData,
    cpanel: cpanelData,
  };
}

@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);

  constructor(
    private readonly domainRepo: DomainRepository,
    @InjectRepository(CpanelData)
    private readonly cpanelRepo: EntityRepository<CpanelData>,
    @InjectRepository(DomainGroup)
    private readonly groupRepo: EntityRepository<DomainGroup>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepo: EntityRepository<SyncLog>,
    private readonly namecheap: NamecheapService,
    private readonly trustPositif: TrustPositifService,
  ) {}

  /** List domains with sort, search, status filter, and pagination */
  async findAll(query?: GetDomainsDto): Promise<PaginatedDomainResponse> {
    const sortBy = query?.sortBy ?? 'name';
    const sortOrder = query?.sortOrder ?? 'asc';
    const search = query?.search?.trim();
    const status = query?.status ?? 'all';
    const usedFilter = query?.usedFilter ?? 'used';
    const nawalaFilter = query?.nawalaFilter ?? 'all';
    const page = Math.max(1, query?.page ?? 1);
    const limit = [10, 50, 100].includes(query?.limit ?? 10)
      ? (query!.limit as 10 | 50 | 100)
      : 10;

    const where: Record<string, unknown> = { id: { $gte: 0 } };

    if (search) {
      where.name = { $ilike: `%${search}%` };
    }

    if (query?.cpanelId != null) {
      where.cpanel = query.cpanelId;
    }
    if (query?.unlinkedOnly) {
      where.cpanel = null;
    }

    if (status === 'expired') {
      where.isExpired = true;
    } else if (status === 'active') {
      where.isExpired = false;
    } else if (status === 'needsRenewal') {
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      where.isExpired = false;
      where.expiryDate = { $gte: now, $lte: in7Days };
    }
    if (usedFilter === 'used') {
      where.isUsed = true;
    } else if (usedFilter === 'notUsed') {
      where.isUsed = false;
    }
    if (nawalaFilter === 'blocked') {
      where.nawala = true;
    } else if (nawalaFilter === 'notBlocked') {
      where.nawala = false;
    }
    if (query?.isDefense === true) {
      where.isDefense = true;
    }
    if (query?.isLinkAlt === true) {
      where.isLinkAlt = true;
    }
    if (query?.groupId != null) {
      where.group = query.groupId;
    }
    if (query?.ungroupedOnly === true) {
      where.group = null;
    }

    const orderDir = sortOrder.toUpperCase() as 'ASC' | 'DESC';
    const orderBy: Record<string, 'ASC' | 'DESC'> =
      sortBy === 'name'
        ? { name: orderDir }
        : sortBy === 'expiryDate'
          ? { expiryDate: orderDir }
          : sortBy === 'created'
            ? { createdAt: orderDir }
            : sortBy === 'status'
              ? { isExpired: orderDir, expiryDate: 'ASC' }
              : sortBy === 'used'
                ? { isUsed: orderDir, name: 'ASC' }
                : { name: 'ASC' };

    const [list, total] = await this.domainRepo.findAndCount(where as never, {
      orderBy,
      limit,
      offset: (page - 1) * limit,
      populate: ['group'],
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data: list.map(toResponse),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /** Get last sync timestamps for domain sync, name server refresh, and nawala check */
  async getSyncMetadata(): Promise<{
    lastDomainSync: string | null;
    lastNameServerRefresh: string | null;
    lastNawalaCheck: string | null;
  }> {
    const [domainSyncRows, nsRefreshRows, nawalaRows] = await Promise.all([
      this.syncLogRepo.find(
        { serviceName: SyncServiceName.DomainSync },
        { orderBy: { timestamp: 'DESC' }, limit: 1 },
      ),
      this.syncLogRepo.find(
        { serviceName: SyncServiceName.NameServerRefresh },
        { orderBy: { timestamp: 'DESC' }, limit: 1 },
      ),
      this.syncLogRepo.find(
        { serviceName: SyncServiceName.NawalaCheck },
        { orderBy: { timestamp: 'DESC' }, limit: 1 },
      ),
    ]);
    return {
      lastDomainSync: domainSyncRows[0]?.timestamp?.toISOString() ?? null,
      lastNameServerRefresh: nsRefreshRows[0]?.timestamp?.toISOString() ?? null,
      lastNawalaCheck: nawalaRows[0]?.timestamp?.toISOString() ?? null,
    };
  }

  /**
   * Domain sync: syncs from Namecheap and refreshes name servers via DNS.
   * Can be triggered manually or by a worker.
   */
  async domainSync(): Promise<{ added: number; updated: number; nsUpdated: number }> {
    const namecheapResult = await this.syncFromNamecheap();
    const nsResult = await this.refreshNameServers();
    await this.recordSync(SyncServiceName.DomainSync);
    return {
      added: namecheapResult.added,
      updated: namecheapResult.updated,
      nsUpdated: nsResult.updated,
    };
  }

  /** Get one domain by our DB id (backoffice shape) */
  async findOne(id: number): Promise<DomainResponse> {
    const domain = await this.domainRepo.findOne({ id }, { populate: ['cpanel', 'group'] });
    if (!domain) {
      throw new NotFoundException(`Domain dengan id ${id} tidak ditemukan`);
    }
    return toResponse(domain);
  }

  /**
   * Sync domains from Namecheap getList:
   * - Fetches all pages (Namecheap returns max 100 per page)
   * - Add new domains to DB (description = null)
   * - Update existing domains' status fields; preserve existing description
   */
  async syncFromNamecheap(): Promise<{ added: number; updated: number }> {
    const PAGE_SIZE = 100;
    const allDomains: Awaited<ReturnType<typeof this.namecheap.getList>>['domains'] = [];
    let page = 1;

    // Fetch all pages: continue while we get a full page (Namecheap max 100/page)
    let batch;
    do {
      batch = await this.namecheap.getList({ page, pageSize: PAGE_SIZE });
      allDomains.push(...batch.domains);
      page++;
    } while (batch.domains.length === PAGE_SIZE);

    let added = 0;
    let updated = 0;

    for (const nc of allDomains) {
      const existingByNcId = nc.id
        ? await this.domainRepo.findOne({ namecheapId: nc.id })
        : null;
      const existingByName =
        existingByNcId ?? (await this.domainRepo.findOne({ name: nc.name }));

      const expiryDate = parseExpires(nc.expires);

      if (existingByName) {
        existingByName.namecheapId = nc.id;
        existingByName.name = nc.name;
        existingByName.user = nc.user;
        existingByName.created = nc.created;
        existingByName.expiryDate = expiryDate;
        existingByName.isExpired = nc.isExpired;
        existingByName.isLocked = nc.isLocked;
        existingByName.autoRenew = nc.autoRenew;
        existingByName.whoisGuard = nc.whoisGuard;
        existingByName.isPremium = nc.isPremium;
        existingByName.isOurDns = nc.isOurDns;
        existingByName.active = !nc.isExpired;
        // description intentionally not updated – preserve DB value
        await this.domainRepo.flush();
        updated++;
      } else {
        const now = new Date();
        const domain = this.domainRepo.create({
          namecheapId: nc.id,
          name: nc.name,
          user: nc.user,
          created: nc.created,
          expiryDate,
          isExpired: nc.isExpired,
          isLocked: nc.isLocked,
          autoRenew: nc.autoRenew,
          whoisGuard: nc.whoisGuard,
          isPremium: nc.isPremium,
          isOurDns: nc.isOurDns,
          active: !nc.isExpired,
          nawala: false,
          isUsed: false,
          isDefense: false,
          isLinkAlt: false,
          description: null,
          createdAt: now,
          updatedAt: now,
        });
        await this.domainRepo.persistAndFlush(domain);
        added++;
      }
    }

    return { added, updated };
  }

  /**
   * Refresh name servers for all domains via DNS lookup (same data as DNS checker).
   * Updates nameServer1 and nameServer2 from live NS records.
   * When called from scheduler (no request context), pass a forked EntityManager.
   */
  async refreshNameServers(forkedEm?: EntityManager): Promise<{ updated: number }> {
    const domainRepo = forkedEm ? forkedEm.getRepository(Domain) : this.domainRepo;
    const domains = await domainRepo.find({ id: { $gte: 0 } }, { orderBy: { id: 'ASC' } });
    const BATCH = 50;
    let updated = 0;

    for (let i = 0; i < domains.length; i += BATCH) {
      const batch = domains.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (d) => {
          const ns = await lookupNameservers(d.name);
          const [ns1, ns2] = ns;
          if (ns.length > 0) {
            d.nameServer1 = ns1 ?? null;
            d.nameServer2 = ns2 ?? null;
          }
        }),
      );
      await domainRepo.flush();
      updated += batch.length;
    }

    return { updated };
  }

  /**
   * Refresh name servers via DNS and record timestamp.
   * Used by the hourly background worker. Runs in a forked EM to avoid global context error.
   */
  async runNameServerRefresh(): Promise<{ updated: number }> {
    const forkedEm = this.domainRepo.getEntityManager().fork();
    const result = await this.refreshNameServers(forkedEm);
    await this.recordSync(SyncServiceName.NameServerRefresh, forkedEm);
    return result;
  }

  private async recordSync(serviceName: SyncServiceName, forkedEm?: EntityManager): Promise<void> {
    const syncLogRepo = forkedEm ? forkedEm.getRepository(SyncLog) : this.syncLogRepo;
    const row = syncLogRepo.create({
      serviceName,
      timestamp: new Date(),
    });
    await syncLogRepo.persistAndFlush(row);
  }

  /** Reactivate expired domain via Namecheap API */
  async reactivate(id: number): Promise<DomainResponse> {
    const domain = await this.domainRepo.findOne({ id });
    if (!domain) throw new NotFoundException(`Domain dengan id ${id} tidak ditemukan`);
    await this.namecheap.reactivate(domain.name);
    // Refresh from Namecheap by re-syncing this domain (getList then update)
    const { domains } = await this.namecheap.getList({ pageSize: 100 });
    const nc = domains.find((d) => d.name === domain.name || d.id === domain.namecheapId);
    if (nc) {
      domain.expiryDate = parseExpires(nc.expires);
      domain.isExpired = nc.isExpired;
      domain.isLocked = nc.isLocked;
      domain.autoRenew = nc.autoRenew;
      domain.whoisGuard = nc.whoisGuard;
      domain.isPremium = nc.isPremium;
      domain.isOurDns = nc.isOurDns;
      domain.active = !nc.isExpired;
      await this.domainRepo.flush();
    }
    return toResponse(domain);
  }

  /** Renew domain via Namecheap API */
  async renew(id: number, years: number): Promise<DomainResponse> {
    const domain = await this.domainRepo.findOne({ id });
    if (!domain) throw new NotFoundException(`Domain dengan id ${id} tidak ditemukan`);
    await this.namecheap.renew(domain.name, years, {
      isPremiumDomain: domain.isPremium ?? false,
    });
    const { domains } = await this.namecheap.getList({ pageSize: 100 });
    const nc = domains.find((d) => d.name === domain.name || d.id === domain.namecheapId);
    if (nc) {
      domain.expiryDate = parseExpires(nc.expires);
      domain.isExpired = nc.isExpired;
      domain.isLocked = nc.isLocked;
      domain.autoRenew = nc.autoRenew;
      domain.whoisGuard = nc.whoisGuard;
      domain.isPremium = nc.isPremium;
      domain.isOurDns = nc.isOurDns;
      domain.active = !nc.isExpired;
      await this.domainRepo.flush();
    }
    return toResponse(domain);
  }

  /** Get domain info from Namecheap (getInfo) and optionally update our DB */
  async getInfo(id: number): Promise<{
    domain: DomainResponse;
    namecheap: { status: string; createdDate?: string; expiredDate?: string };
  }> {
    const domain = await this.domainRepo.findOne({ id });
    if (!domain) throw new NotFoundException(`Domain dengan id ${id} tidak ditemukan`);
    const info = await this.namecheap.getInfo(domain.name);
    const details = info.DomainDetails;
    return {
      domain: toResponse(domain),
      namecheap: {
        status: info.Status ?? '',
        createdDate: details?.CreatedDate,
        expiredDate: details?.ExpiredDate,
      },
    };
  }

  async create(dto: CreateDomainDto): Promise<Domain> {
    const now = new Date();
    const domain = this.domainRepo.create({
      name: dto.name,
      active: dto.active ?? true,
      expiryDate: new Date(dto.expiryDate),
      description: dto.description ?? null,
      nameServer1: dto.nameServer1 ?? null,
      nameServer2: dto.nameServer2 ?? null,
      isExpired: false,
      isLocked: false,
      autoRenew: false,
      nawala: false,
      isUsed: dto.isUsed ?? false,
      isDefense: false,
      isLinkAlt: false,
      category: dto.category ?? null,
      group: dto.groupId != null ? this.groupRepo.getReference(dto.groupId) : null,
      createdAt: now,
      updatedAt: now,
    });
    await this.domainRepo.persistAndFlush(domain);
    return domain;
  }

  async update(id: number, dto: UpdateDomainDto): Promise<Domain> {
    const domain = await this.domainRepo.findOne({ id });
    if (!domain) throw new NotFoundException(`Domain dengan id ${id} tidak ditemukan`);
    if (dto.name != null) domain.name = dto.name;
    if (dto.active != null) domain.active = dto.active;
    if (dto.expiryDate != null) domain.expiryDate = new Date(dto.expiryDate);
    if (dto.description !== undefined) domain.description = dto.description;
    if (dto.nameServer1 !== undefined) domain.nameServer1 = dto.nameServer1;
    if (dto.nameServer2 !== undefined) domain.nameServer2 = dto.nameServer2;
    if (dto.cpanelId !== undefined) {
      domain.cpanel =
        dto.cpanelId == null ? null : this.cpanelRepo.getReference(dto.cpanelId);
    }
    if (dto.isUsed !== undefined) domain.isUsed = dto.isUsed;
    if (dto.category !== undefined) domain.category = dto.category ?? null;
    if (dto.isDefense !== undefined) domain.isDefense = dto.isDefense;
    if (dto.isLinkAlt !== undefined) domain.isLinkAlt = dto.isLinkAlt;
    if (dto.groupId !== undefined) {
      domain.group = dto.groupId == null ? null : this.groupRepo.getReference(dto.groupId);
    }
    await this.domainRepo.flush();
    return domain;
  }

  async setNameServers(
    id: number,
    nameServer1: string,
    nameServer2: string,
  ): Promise<Domain> {
    const domain = await this.domainRepo.findOne({ id });
    if (!domain) throw new NotFoundException(`Domain dengan id ${id} tidak ditemukan`);
    domain.nameServer1 = nameServer1;
    domain.nameServer2 = nameServer2;
    await this.domainRepo.flush();
    return domain;
  }

  async remove(id: number): Promise<void> {
    const domain = await this.domainRepo.findOne({ id });
    if (!domain) throw new NotFoundException(`Domain dengan id ${id} tidak ditemukan`);
    await this.domainRepo.removeAndFlush(domain);
  }

  /**
   * Refresh nawala (blocked) status by querying Trust Positif.
   * When the script exists, runs it via `at now` so it runs in atd's context (working network/VPN like cron).
   * Otherwise runs in-process (or sync script if at is unavailable).
   */
  async refreshNawala(): Promise<{ checked: number; updated: number; started?: boolean }> {
    const scriptFromDir = join(__dirname, '..', '..', 'scripts', 'nawala-cron.sh');
    const scriptFromCwd = join(process.cwd(), 'scripts', 'nawala-cron.sh');
    const scriptPath = existsSync(scriptFromDir) ? scriptFromDir : existsSync(scriptFromCwd) ? scriptFromCwd : null;
    if (scriptPath) {
      const apiUrl = process.env.NAWALA_CRON_API_URL?.trim() || 'http://127.0.0.1:3000';
      const appRoot = dirname(dirname(scriptPath));
      const atCmd = `cd ${appRoot} && NAWALA_CRON_API_URL=${apiUrl} ${scriptPath}\n`;
      const atResult = spawnSync('at', ['now'], {
        encoding: 'utf-8',
        input: atCmd,
        timeout: 10_000,
      });
      if (atResult.status === 0 && !atResult.error) {
        this.logger.log(`Refresh Nawala: scheduled via at now (script at ${scriptPath})`);
        return { checked: 0, updated: 0, started: true };
      }
      this.logger.log(
        `Refresh Nawala: at not available (${atResult.status ?? atResult.error?.message}), running script sync`,
      );
      const start = Date.now();
      const out = this.runNawalaCronScript(scriptPath);
      this.logger.log(`Refresh Nawala: script finished in ${Date.now() - start}ms`);
      return out;
    }
    this.logger.log(`Refresh Nawala: script not found (tried ${scriptFromDir}, ${scriptFromCwd}), using in-process`);
    return this.refreshNawalaInProcess();
  }

  /** Run the nawala cron script and return { checked, updated }. Script must echo NAWALA_APPLY_RESULT=<json> on success. */
  private runNawalaCronScript(scriptPath: string): { checked: number; updated: number } {
    const apiUrl = process.env.NAWALA_CRON_API_URL?.trim() || 'http://127.0.0.1:3000';
    const timeoutMs = 300_000; // 5 minutes
    const result = spawnSync(scriptPath, [], {
      encoding: 'utf-8',
      env: { ...process.env, NAWALA_CRON_API_URL: apiUrl } as NodeJS.ProcessEnv,
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024,
    });
    const stdout = result.stdout ?? '';
    const stderr = (result.stderr ?? '').trim();

    if (result.error) {
      const err = result.error as NodeJS.ErrnoException;
      const isTimeout = err?.code === 'ETIMEDOUT';
      this.logger.error(`Nawala script spawn failed: ${result.error.message}`);
      if (isTimeout) {
        throw new Error(
          `Nawala script did not finish within 5 minutes. Run the script by hand (./scripts/nawala-cron.sh) or use cron; the button may time out.`,
        );
      }
      throw new Error(`Nawala script could not run: ${result.error.message}. Check that scripts/nawala-cron.sh exists and is executable.`);
    }
    if (result.status !== 0 || result.signal) {
      const detail =
        result.signal === 'SIGKILL'
          ? `Script was killed (e.g. timed out). Check VPN and Trust Positif reachability.`
          : result.signal
            ? `Script killed by ${result.signal}.`
            : `Script exited with code ${result.status}.`;
      const outSnippet = [stderr, stdout].filter(Boolean).join('\n').slice(0, 400);
      this.logger.error(`Nawala script failed: ${detail} stderr=${stderr.slice(0, 500)}`);
      const msg = outSnippet ? `${detail} Output: ${outSnippet}` : detail;
      throw new Error(`Nawala script failed: ${msg}`);
    }
    const match = stdout.match(/NAWALA_APPLY_RESULT=(.+)/m);
    if (!match?.[1]) {
      this.logger.error(`Nawala script did not output NAWALA_APPLY_RESULT. stdout=${stdout.slice(0, 300)}`);
      throw new Error('Nawala script completed but did not output a result. Check server logs.');
    }
    try {
      const parsed = JSON.parse(match[1].trim()) as { checked?: number; updated?: number };
      return { checked: Number(parsed.checked) || 0, updated: Number(parsed.updated) || 0 };
    } catch (e) {
      this.logger.error(`Nawala script result parse error: ${e instanceof Error ? e.message : String(e)}`);
      throw new Error('Nawala script returned invalid JSON result.');
    }
  }

  /** In-process Trust Positif check (Node or in-app curl). */
  private async refreshNawalaInProcess(): Promise<{ checked: number; updated: number }> {
    const forkedEm = this.domainRepo.getEntityManager().fork();
    const domainRepo = forkedEm.getRepository(Domain);

    const usedDomains = await domainRepo.find(
      { isUsed: true },
      { orderBy: { name: 'ASC' } },
    );
    if (usedDomains.length === 0) {
      this.logger.log('Nawala refresh: no used domains to check. Mark domains as Used to include them.');
      return { checked: 0, updated: 0 };
    }

    const BATCH_SIZE = 50;
    const resultsMap = new Map<string, boolean>();

    for (let i = 0; i < usedDomains.length; i += BATCH_SIZE) {
      const batch = usedDomains.slice(i, i + BATCH_SIZE);
      const names = batch.map((d) => d.name);
      const results = await this.trustPositif.checkDomains(names);
      for (const r of results) {
        const key = r.domain.toLowerCase().trim();
        resultsMap.set(key, r.blocked);
        const withoutWww = key.replace(/^www\./, '');
        if (withoutWww !== key) resultsMap.set(withoutWww, r.blocked);
      }
    }

    let updated = 0;
    for (const domain of usedDomains) {
      const key = domain.name.toLowerCase().trim();
      const keyNoWww = key.replace(/^www\./, '');
      const blocked = resultsMap.get(key) ?? resultsMap.get(keyNoWww);
      if (blocked !== undefined && domain.nawala !== blocked) {
        domain.nawala = blocked;
        updated++;
      }
    }
    await domainRepo.flush();
    await this.recordSync(SyncServiceName.NawalaCheck, forkedEm);

    if (updated === 0 && usedDomains.length > 0) {
      this.logger.log(
        `Nawala check: ${usedDomains.length} used domains checked, 0 updated. If you expect blocked sites, check server logs for "Trust Positif" to see returned status values.`,
      );
    }

    return { checked: usedDomains.length, updated };
  }

  /** Used by nawala cron script: return used domain names only. */
  async getUsedDomainNames(): Promise<string[]> {
    const used = await this.domainRepo.find(
      { isUsed: true },
      { orderBy: { name: 'ASC' }, fields: ['name'] },
    );
    return used.map((d) => d.name);
  }

  /** Used by nawala cron script: apply Trust Positif results. */
  async applyNawalaResultsFromCron(
    results: Array<{ domain: string; blocked: boolean }>,
  ): Promise<{ checked: number; updated: number }> {
    if (results.length === 0) return { checked: 0, updated: 0 };

    const forkedEm = this.domainRepo.getEntityManager().fork();
    const domainRepo = forkedEm.getRepository(Domain);
    const resultsMap = new Map<string, boolean>();
    for (const r of results) {
      const key = r.domain.toLowerCase().trim();
      resultsMap.set(key, r.blocked);
      const withoutWww = key.replace(/^www\./, '');
      if (withoutWww !== key) resultsMap.set(withoutWww, r.blocked);
    }

    const usedDomains = await domainRepo.find({ isUsed: true }, { orderBy: { name: 'ASC' } });
    let updated = 0;
    for (const domain of usedDomains) {
      const key = domain.name.toLowerCase().trim();
      const keyNoWww = key.replace(/^www\./, '');
      const blocked = resultsMap.get(key) ?? resultsMap.get(keyNoWww);
      if (blocked !== undefined && domain.nawala !== blocked) {
        domain.nawala = blocked;
        updated++;
      }
    }
    await domainRepo.flush();
    await this.recordSync(SyncServiceName.NawalaCheck, forkedEm);
    return { checked: usedDomains.length, updated };
  }

  /**
   * Mark domains as used from a .txt file (one domain per line).
   * Parses by line break, matches domain names (case-insensitive), sets isUsed = true.
   */
  async bulkMarkUsedFromFile(file: Buffer): Promise<{ matched: number; updated: number }> {
    const lines = file.toString('utf-8').split(/\r\n|\r|\n/);
    const namesFromFile = [...new Set(lines.map((l) => l.trim().toLowerCase()).filter(Boolean))];
    if (namesFromFile.length === 0) {
      return { matched: 0, updated: 0 };
    }

    const allDomains = await this.domainRepo.find({ id: { $gte: 0 } });
    const nameToDomain = new Map<string, Domain>();
    for (const d of allDomains) {
      const key = d.name.toLowerCase().trim();
      if (!nameToDomain.has(key)) nameToDomain.set(key, d);
    }

    let updated = 0;
    for (const name of namesFromFile) {
      const domain = nameToDomain.get(name);
      if (domain && !domain.isUsed) {
        domain.isUsed = true;
        updated++;
      }
    }
    await this.domainRepo.flush();

    const matched = namesFromFile.filter((n) => nameToDomain.has(n)).length;
    return { matched, updated };
  }
}
