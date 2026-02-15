import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { NamecheapConfig } from './namecheap-config.entity';
import { config } from '../config';

export interface NamecheapConfigDto {
  apiUser: string;
  username: string;
  password?: string | null;
  apiKey: string;
  clientIp: string;
  baseUrl?: string | null;
}

/** Credentials used by NamecheapService (no sensitive values in logs) */
export interface NamecheapCredentials {
  apiUser: string;
  username: string;
  apiKey: string;
  clientIp: string;
  baseUrl: string;
}

const DEFAULT_BASE_URL = 'https://api.namecheap.com/xml.response';

@Injectable()
export class NamecheapConfigService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Get the single Namecheap config row. Throws if not set.
   * Used by NamecheapService for API calls.
   */
  async getCredentials(): Promise<NamecheapCredentials> {
    const rows = await this.em.find(NamecheapConfig, { id: { $gte: 0 } }, { orderBy: { id: 'ASC' }, limit: 1 });
    const row = rows[0] ?? null;
    if (row) {
      return {
        apiUser: row.apiUser,
        username: row.username,
        apiKey: row.apiKey,
        clientIp: row.clientIp,
        baseUrl: row.baseUrl ?? DEFAULT_BASE_URL,
      };
    }
    // Fallback to .env when DB has no config (e.g. NAMECHEAP_API_USER, NAMECHEAP_USERNAME, etc.)
    const apiUser = config.namecheapApiUser;
    const username = config.namecheapUserName;
    const apiKey = config.namecheapApiKey;
    const clientIp = config.namecheapClientIp;
    if (apiUser && username && apiKey && clientIp) {
      return {
        apiUser,
        username,
        apiKey,
        clientIp,
        baseUrl: config.namecheapBaseUrl || DEFAULT_BASE_URL,
      };
    }
    throw new NotFoundException(
      'Namecheap config not set. Add a row to namecheap_config, use PUT /domains/namecheap-config, or set NAMECHEAP_API_USER, NAMECHEAP_USERNAME, NAMECHEAP_API_KEY, NAMECHEAP_CLIENT_IP in .env.',
    );
  }

  /** Response with masked sensitive fields for GET */
  async getConfigForDisplay(): Promise<{
    id: number;
    apiUser: string;
    username: string;
    password: string | null;
    apiKey: string;
    clientIp: string;
    baseUrl: string | null;
    updatedAt: Date;
  } | null> {
    const rows = await this.em.find(NamecheapConfig, { id: { $gte: 0 } }, { orderBy: { id: 'ASC' }, limit: 1 });
    const row = rows[0] ?? null;
    if (!row) return null;
    return {
      id: row.id,
      apiUser: row.apiUser,
      username: row.username,
      password: row.password ? '********' : null,
      apiKey: row.apiKey ? '********' : '',
      clientIp: row.clientIp,
      baseUrl: row.baseUrl ?? null,
      updatedAt: row.updatedAt,
    };
  }

  /**
   * Create or update the single Namecheap config row (upsert singleton).
   */
  async setConfig(dto: NamecheapConfigDto): Promise<NamecheapConfig> {
    const rows = await this.em.find(NamecheapConfig, { id: { $gte: 0 } }, { orderBy: { id: 'ASC' }, limit: 1 });
    const existing = rows[0] ?? null;
    if (existing) {
      existing.apiUser = dto.apiUser;
      existing.username = dto.username;
      existing.password = dto.password ?? null;
      existing.apiKey = dto.apiKey;
      existing.clientIp = dto.clientIp;
      existing.baseUrl = dto.baseUrl ?? null;
      await this.em.flush();
      return existing;
    }
    const row = this.em.create(NamecheapConfig, {
      apiUser: dto.apiUser,
      username: dto.username,
      password: dto.password ?? null,
      apiKey: dto.apiKey,
      clientIp: dto.clientIp,
      baseUrl: dto.baseUrl ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await this.em.persistAndFlush(row);
    return row;
  }
}
