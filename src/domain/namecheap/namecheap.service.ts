import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';
import { NamecheapConfigService } from '../namecheap-config.service';
import type {
  NamecheapGetListResult,
  NamecheapDomainListItemRaw,
  NamecheapDomainRenewResult,
  NamecheapDomainGetInfoResult,
  NamecheapDomainListItem,
} from './namecheap.types';

const COMMANDS = {
  getList: 'namecheap.domains.getList',
  reactivate: 'namecheap.domains.reactivate',
  renew: 'namecheap.domains.renew',
  getInfo: 'namecheap.domains.getInfo',
} as const;

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

@Injectable()
export class NamecheapService {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  constructor(
    private readonly http: HttpService,
    private readonly namecheapConfig: NamecheapConfigService,
  ) {}

  private async request<T>(command: string, extraParams: Record<string, string> = {}): Promise<T> {
    const creds = await this.namecheapConfig.getCredentials();
    const params = {
      ApiUser: creds.apiUser,
      ApiKey: creds.apiKey,
      UserName: creds.username,
      Command: command,
      ClientIp: creds.clientIp,
      ...extraParams,
    };
    const url = creds.baseUrl;
    const res = await firstValueFrom(
      this.http.get<string>(url, { params, responseType: 'text' as 'json' }),
    );
    const data = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    const parsed = this.parser.parse(data) as {
      ApiResponse?: {
        '@_Status'?: string;
        Errors?: { Error?: { '@_Number'?: string; '#text'?: string } | Array<{ '@_Number'?: string; '#text'?: string }> };
        CommandResponse?: Record<string, unknown>;
      };
    };
    const api = parsed?.ApiResponse;
    const status = api?.['@_Status'];
    const errors = api?.Errors;
    const errList = errors?.Error != null ? ensureArray(errors.Error) : [];
    if (status === 'ERROR' || (errList.length > 0 && errList.some((e) => e['@_Number']))) {
      const msg = errList.map((e) => e['#text'] || e['@_Number']).filter(Boolean).join('; ') || status;
      throw new Error(`Namecheap API error: ${msg}`);
    }
    const cmd = api?.CommandResponse;
    return cmd as T;
  }

  /**
   * namecheap.domains.getList
   * Optional: ListType (ALL|EXPIRING|EXPIRED), Page, PageSize, SortBy, SearchTerm
   */
  async getList(options: {
    listType?: 'ALL' | 'EXPIRING' | 'EXPIRED';
    page?: number;
    pageSize?: number;
    sortBy?: string;
    searchTerm?: string;
  } = {}): Promise<{
    domains: NamecheapDomainListItem[];
    paging: { totalItems: number; currentPage: number; pageSize: number };
  }> {
    const params: Record<string, string> = {};
    if (options.listType) params.ListType = options.listType;
    if (options.page != null) params.Page = String(options.page);
    if (options.pageSize != null) params.PageSize = String(options.pageSize);
    if (options.sortBy) params.SortBy = options.sortBy;
    if (options.searchTerm) params.SearchTerm = options.searchTerm;

    const raw = await this.request<{
      DomainGetListResult?: NamecheapGetListResult;
      Paging?: { TotalItems?: string; CurrentPage?: string; PageSize?: string };
    }>(COMMANDS.getList, params);
    const result = raw?.DomainGetListResult;
    const list = result?.Domain;
    const rawDomains = ensureArray(list ?? []);
    const paging = raw?.Paging; // Paging is sibling of DomainGetListResult in CommandResponse
    const domains: NamecheapDomainListItem[] = rawDomains.map((d) => {
      const r = d as NamecheapDomainListItemRaw;
      return {
        id: r['@_ID'] ?? '',
        name: r['@_Name'] ?? '',
        user: r['@_User'] ?? '',
        created: r['@_Created'] ?? '',
        expires: r['@_Expires'] ?? '',
        isExpired: (r['@_IsExpired'] ?? 'false').toLowerCase() === 'true',
        isLocked: (r['@_IsLocked'] ?? 'false').toLowerCase() === 'true',
        autoRenew: (r['@_AutoRenew'] ?? 'false').toLowerCase() === 'true',
        whoisGuard: r['@_WhoisGuard'] ?? '',
        isPremium: (r['@_IsPremium'] ?? 'false').toLowerCase() === 'true',
        isOurDns: (r['@_IsOurDNS'] ?? 'false').toLowerCase() === 'true',
      };
    });
    return {
      domains,
      paging: {
        totalItems: paging?.TotalItems ? parseInt(paging.TotalItems, 10) : domains.length,
        currentPage: paging?.CurrentPage ? parseInt(paging.CurrentPage, 10) : 1,
        pageSize: paging?.PageSize ? parseInt(paging.PageSize, 10) : domains.length,
      },
    };
  }

  /**
   * namecheap.domains.reactivate
   * Required: DomainName
   */
  async reactivate(domainName: string): Promise<{ success: boolean }> {
    const raw = await this.request<{ DomainReactivateResult?: { '@_Domain'?: string; '@_IsSuccess'?: string } }>(
      COMMANDS.reactivate,
      { DomainName: domainName },
    );
    const result = raw?.DomainReactivateResult ?? (raw as Record<string, unknown>);
    const success = result?.['@_IsSuccess'] === 'true' || (result as { IsSuccess?: string })?.IsSuccess === 'true';
    return { success };
  }

  /**
   * namecheap.domains.renew
   * Required: DomainName, Years. Optional: PromotionCode, IsPremiumDomain, PremiumPrice
   */
  async renew(
    domainName: string,
    years: number,
    options: { isPremiumDomain?: boolean; premiumPrice?: number; promotionCode?: string } = {},
  ): Promise<NamecheapDomainRenewResult> {
    const params: Record<string, string> = {
      DomainName: domainName,
      Years: String(years),
    };
    if (options.promotionCode) params.PromotionCode = options.promotionCode;
    if (options.isPremiumDomain !== undefined) params.IsPremiumDomain = String(options.isPremiumDomain);
    if (options.premiumPrice !== undefined) params.PremiumPrice = String(options.premiumPrice);

    const raw = await this.request<{ DomainRenewResult: NamecheapDomainRenewResult }>(
      COMMANDS.renew,
      params,
    );
    const result = raw?.DomainRenewResult;
    if (!result) throw new Error('Namecheap renew: no DomainRenewResult in response');
    return result as NamecheapDomainRenewResult;
  }

  /**
   * namecheap.domains.getInfo
   * Required: DomainName. Optional: HostName
   */
  async getInfo(domainName: string, hostName?: string): Promise<NamecheapDomainGetInfoResult> {
    const params: Record<string, string> = { DomainName: domainName };
    if (hostName) params.HostName = hostName;
    const raw = await this.request<{ DomainGetInfoResult: NamecheapDomainGetInfoResult }>(
      COMMANDS.getInfo,
      params,
    );
    const result = raw?.DomainGetInfoResult;
    if (!result) throw new Error('Namecheap getInfo: no DomainGetInfoResult in response');
    return result as NamecheapDomainGetInfoResult;
  }
}
