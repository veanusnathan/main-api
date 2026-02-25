import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as https from 'node:https';
import * as tls from 'node:tls';
import { execSync } from 'node:child_process';
import { unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

  /** When connecting by IP, use an agent that binds to VPN source IP so traffic goes via the tunnel. */
  private _trustPositifAgent: https.Agent | null = null;
  private get httpsAgent(): https.Agent | undefined {
    const base = this.baseUrl;
    if (!base.startsWith('https://') || base.includes(TRUST_POSITIF_HOST)) return undefined;
    if (this._trustPositifAgent) return this._trustPositifAgent;
    const vpnSource = process.env.TRUST_POSITIF_VPN_SOURCE_IP?.trim();
    this._trustPositifAgent = new https.Agent({
      keepAlive: false,
      createConnection(options: tls.ConnectionOptions, callback: (err: Error | null, stream?: tls.TLSSocket) => void) {
        const tlsOpts: tls.ConnectionOptions = {
          host: options.host ?? options.servername,
          port: options.port ?? 443,
          servername: TRUST_POSITIF_HOST,
          family: 4,
          ...(vpnSource && { localAddress: vpnSource }),
        };
        const sock = tls.connect(tlsOpts);
        sock.once('secure', () => callback(null, sock));
        sock.once('error', (e) => callback(e));
      },
    });
    return this._trustPositifAgent;
  }

  /** Request headers: add Host when using an IP base URL so virtual host works. */
  private requestHeaders(extra?: Record<string, string>): Record<string, string> {
    const base = this.baseUrl;
    const out: Record<string, string> = { ...this.headers };
    if (base.startsWith('https://') && !base.includes(TRUST_POSITIF_HOST)) {
      out.Host = TRUST_POSITIF_HOST;
    }
    if (extra) Object.assign(out, extra);
    return out;
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
   * If TRUST_POSITIF_USE_CURL=1, use curl (works when Node cannot use the VPN path).
   */
  async checkDomains(domains: string[]): Promise<TrustPositifResult[]> {
    if (domains.length === 0) return [];
    if (process.env.TRUST_POSITIF_USE_CURL === '1' || process.env.TRUST_POSITIF_USE_CURL === 'true') {
      return this.checkDomainsViaCurl(domains);
    }
    return this.checkDomainsTrustPositif(domains);
  }

  /**
   * Use curl for Trust Positif when Node cannot reach the site (e.g. VPN routing quirk).
   * Requires TRUST_POSITIF_BASE_URL (IP), optional TRUST_POSITIF_VPN_SOURCE_IP for --interface.
   */
  private checkDomainsViaCurl(domains: string[]): TrustPositifResult[] {
    const base = this.baseUrl;
    if (base.includes(TRUST_POSITIF_HOST)) {
      throw new Error('TRUST_POSITIF_USE_CURL requires TRUST_POSITIF_BASE_URL to an IP (e.g. https://182.23.79.198)');
    }
    const iface = process.env.TRUST_POSITIF_VPN_SOURCE_IP?.trim();
    const ifaceArg = iface ? `--interface ${iface}` : '';
    const prefix = base.replace(/^https:\/\//, '');
    const cookieFile = join(tmpdir(), `trustpositif-cookies-${process.pid}.txt`);
    try {
      const getCmd = `curl -s -k ${ifaceArg} -H "Host: ${TRUST_POSITIF_HOST}" -c "${cookieFile}" "${base}/"`;
      const html = execSync(getCmd, { encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 });
      const csrfToken = this.extractCsrfToken(html);
      const name = domains.join('\n');
      const body = `csrf_token=${encodeURIComponent(csrfToken)}&name=${encodeURIComponent(name)}`;
      const postCmd = `curl -s -k ${ifaceArg} -H "Host: ${TRUST_POSITIF_HOST}" -b "${cookieFile}" -X POST --data-raw ${JSON.stringify(body)} "${base}/Rest_server/getrecordsname_home"`;
      const jsonOut = execSync(postCmd, { encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 });
      const data = JSON.parse(jsonOut) as { values?: Array<Record<string, unknown>> };
      const values = data?.values;
      if (!Array.isArray(values)) {
        throw new Error('Trust Positif response invalid (no values array)');
      }
      const returnedDomains = new Set(
        values.map((row) => String((row.Domain ?? row.domain ?? '') as string).trim().toLowerCase()),
      );
      const requestedSet = new Set(domains.map((d) => d.trim().toLowerCase()));
      const missing = [...requestedSet].filter((d) => d && !returnedDomains.has(d));
      if (missing.length > 0) {
        throw new Error(`Trust Positif did not return results for all requested domains (missing: ${missing.length})`);
      }
      const BLOCKED_VALUES = new Set(['ada', 'blocked', 'terblokir', 'yes', '1']);
      return values.map((row) => {
        const domain = String((row.Domain ?? row.domain ?? '') as string).trim();
        const status = String((row.Status ?? row.status ?? '') as string).trim().toLowerCase();
        const blocked = BLOCKED_VALUES.has(status);
        return { domain, blocked };
      });
    } finally {
      if (existsSync(cookieFile)) unlinkSync(cookieFile);
    }
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
          httpsAgent: this.httpsAgent,
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
            httpsAgent: this.httpsAgent,
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
