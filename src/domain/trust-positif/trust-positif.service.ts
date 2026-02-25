import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

const TRUST_POSITIF_HOST = 'trustpositif.komdigi.go.id';
const TRUST_POSITIF_BASE_DEFAULT = `https://${TRUST_POSITIF_HOST}`;

export interface TrustPositifResult {
  domain: string;
  /** true = blocked (Ada), false = not blocked (Tidak Ada) */
  blocked: boolean;
}

@Injectable()
export class TrustPositifService {
  private readonly logger = new Logger(TrustPositifService.name);
  private readonly headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
  };

  constructor(private readonly http: HttpService) {}

  /** Base URL for Trust Positif. If TRUST_POSITIF_BASE_URL is set (e.g. https://182.23.79.198), use it to avoid DNS lookup on the VPS. */
  private get baseUrl(): string {
    const url = process.env.TRUST_POSITIF_BASE_URL?.trim();
    if (url) return url.replace(/\/$/, '');
    return TRUST_POSITIF_BASE_DEFAULT;
  }

  /** Request headers: add Host when using an IP base URL so TLS SNI and virtual host work. */
  private requestHeaders(extra?: Record<string, string>): Record<string, string> {
    const base = this.baseUrl;
    const hostHeader =
      base.startsWith('https://') && !base.includes(TRUST_POSITIF_HOST) ? { Host: TRUST_POSITIF_HOST } : {};
    return { ...this.headers, ...hostHeader, ...extra };
  }

  /** Extract cookie string from Set-Cookie headers for next request */
  private getCookieHeader(response: { headers: { 'set-cookie'?: string | string[] } }): string | undefined {
    const setCookies = response.headers['set-cookie'];
    if (!setCookies) return undefined;
    const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
    return arr
      .map((c) => {
        const [part] = String(c).split(';');
        return part?.trim() ?? '';
      })
      .filter(Boolean)
      .join('; ');
  }

  /** Extract CSRF token from form HTML */
  private extractCsrfToken(html: string): string {
    const match =
      html.match(/name=["']csrf_token["'][^>]*value=["']([^"']+)["']/i) ??
      html.match(/value=["']([^"']+)["'][^>]*name=["']csrf_token["']/i);
    if (!match?.[1]) {
      throw new Error('Could not extract CSRF token from Trust Positif page');
    }
    return match[1];
  }

  /**
   * Check domain block status by simulating a user entering domain names on Trust Positif.
   * This is the only method used: GET homepage (CSRF + cookies), then POST domain names to getrecordsname_home.
   * No fallback or alternative API. If Trust Positif is unreachable or returns invalid data, the call fails.
   */
  async checkDomains(domains: string[]): Promise<TrustPositifResult[]> {
    if (domains.length === 0) return [];
    return this.checkDomainsTrustPositif(domains);
  }

  /**
   * Simulates user: open Trust Positif page, then submit domain names via the same form/API (getrecordsname_home).
   * Fails on GET failure, non-2xx POST, missing/invalid response, or missing rows for requested domains.
   */
  private async checkDomainsTrustPositif(domains: string[]): Promise<TrustPositifResult[]> {
    const base = this.baseUrl;
    let getRes;
    try {
      getRes = await firstValueFrom(
        this.http.get<string>(`${base}/`, {
          headers: this.requestHeaders(),
          responseType: 'text',
          timeout: 30000,
          maxRedirects: 5,
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Trust Positif GET failed: ${msg}`, err instanceof Error ? err.stack : undefined);
      throw new Error(
        `Trust Positif website check failed (cannot load page): ${msg}. No fallback.`,
      );
    }
    const html = typeof getRes.data === 'string' ? getRes.data : String(getRes.data);
    const csrfToken = this.extractCsrfToken(html);
    const cookieHeader = this.getCookieHeader(getRes);

    const name = domains.join('\n');
    const body = new URLSearchParams({
      csrf_token: csrfToken,
      name,
    }).toString();

    const postHeaders: Record<string, string> = {
      ...this.requestHeaders({
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Referer: `${base}/`,
      }),
    };
    if (cookieHeader) {
      postHeaders['Cookie'] = cookieHeader;
    }

    let postRes;
    try {
      postRes = await firstValueFrom(
        this.http.post<{ values?: Array<Record<string, unknown>> }>(
          `${base}/Rest_server/getrecordsname_home`,
          body,
          {
            headers: postHeaders,
            responseType: 'json',
            timeout: 30000,
            validateStatus: () => true,
          },
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Trust Positif POST failed: ${msg}`, err instanceof Error ? err.stack : undefined);
      throw new Error(`Trust Positif check failed: ${msg}. The website check (simulate user entering names) did not complete.`);
    }

    if (postRes.status < 200 || postRes.status >= 300) {
      const preview =
        typeof postRes.data === 'object'
          ? JSON.stringify(postRes.data).slice(0, 200)
          : String(postRes.data).slice(0, 200);
      this.logger.error(`Trust Positif POST returned status ${postRes.status}, body=${preview}`);
      throw new Error(
        `Trust Positif returned HTTP ${postRes.status}. The website check is not working. No fallback.`,
      );
    }

    const values = postRes.data?.values;
    if (!Array.isArray(values)) {
      const preview =
        typeof postRes.data === 'object'
          ? JSON.stringify(postRes.data).slice(0, 300)
          : String(postRes.data).slice(0, 300);
      this.logger.error(
        `Trust Positif returned invalid response (no values array): status=${postRes.status}, body=${preview}`,
      );
      throw new Error(
        `Trust Positif response invalid (no values array). The website check did not return usable data. No fallback.`,
      );
    }

    const returnedDomains = new Set(values.map((row) => String((row.Domain ?? row.domain ?? '') as string).trim().toLowerCase()));
    const requestedSet = new Set(domains.map((d) => d.trim().toLowerCase()));
    const missing = [...requestedSet].filter((d) => d && !returnedDomains.has(d));
    if (missing.length > 0) {
      this.logger.error(`Trust Positif did not return rows for ${missing.length} requested domain(s): ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? '...' : ''}`);
      throw new Error(
        `Trust Positif did not return results for all requested domains (missing: ${missing.length}). The website check is incomplete. No fallback.`,
      );
    }

    const BLOCKED_VALUES = new Set(['ada', 'blocked', 'terblokir', 'yes', '1']);
    const results: TrustPositifResult[] = [];
    const statusCounts = { blocked: 0, notBlocked: 0, unknown: 0 };
    const unknownStatuses = new Set<string>();

    for (const row of values) {
      const domain = String((row.Domain ?? row.domain ?? '') as string).trim();
      const rawStatus = String((row.Status ?? row.status ?? '') as string).trim();
      const status = rawStatus.toLowerCase();
      const blocked = BLOCKED_VALUES.has(status);
      results.push({ domain, blocked });

      if (blocked) statusCounts.blocked++;
      else if (status === 'tidak ada' || status === 'allowed' || status === 'tidak terblokir' || status === 'no' || status === '0' || status === '') statusCounts.notBlocked++;
      else {
        statusCounts.unknown++;
        if (rawStatus) unknownStatuses.add(rawStatus);
      }
    }

    this.logger.log(
      `Trust Positif: ${values.length} rows, blocked=${statusCounts.blocked}, notBlocked=${statusCounts.notBlocked}, unknown=${statusCounts.unknown}`,
    );
    if (unknownStatuses.size > 0) {
      this.logger.warn(`Trust Positif unknown status values: ${[...unknownStatuses].join(', ')}`);
    }

    return results;
  }
}
