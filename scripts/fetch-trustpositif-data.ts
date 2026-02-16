/**
 * Fetches Trust Positif (Nawala) status for all used domains from the DB
 * and writes the response to trustpositif-data.txt at repo root (same level as DEPLOYMENT.md).
 *
 * Run from main-api: pnpm run script:trustpositif
 * Requires .env or .env.development with POSTGRES_* and NODE_ENV.
 */

import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
// Load env from main-api root (same as main app)
import { config as loadEnv } from 'dotenv-flow';
loadEnv({ path: path.join(__dirname, '..'), default_node_env: 'development' });
import { MikroORM } from '@mikro-orm/postgresql';
import { Domain } from '../src/domain/domain.entity';
import { CpanelData } from '../src/cpanel/cpanel.entity';

const TRUST_POSITIF_BASE = 'https://trustpositif.komdigi.go.id';
const BATCH_SIZE = 50;
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
};

function getCookieHeader(response: { headers: Record<string, unknown> }): string {
  const setCookies = response.headers['set-cookie'];
  if (!setCookies) return '';
  const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
  return arr
    .map((c) => {
      const [part] = String(c).split(';');
      return part?.trim() ?? '';
    })
    .filter(Boolean)
    .join('; ');
}

function extractCsrfToken(html: string): string {
  const match =
    html.match(/name=["']csrf_token["'][^>]*value=["']([^"']+)["']/i) ??
    html.match(/value=["']([^"']+)["'][^>]*name=["']csrf_token["']/i);
  if (!match?.[1]) {
    throw new Error('Could not extract CSRF token from Trust Positif page');
  }
  return match[1];
}

async function fetchTrustPositifForDomains(domainNames: string[]): Promise<{ values: Array<{ Domain: string; Status: string }> }> {
  const getRes = await axios.get<string>(`${TRUST_POSITIF_BASE}/`, {
    headers: HEADERS,
    responseType: 'text',
    timeout: 30000,
    maxRedirects: 5,
  });
  const html = typeof getRes.data === 'string' ? getRes.data : String(getRes.data);
  const csrfToken = extractCsrfToken(html);
  const cookieHeader = getCookieHeader(getRes as { headers: Record<string, unknown> });

  const name = domainNames.join('\n');
  const body = new URLSearchParams({ csrf_token: csrfToken, name }).toString();

  const postHeaders: Record<string, string> = {
    'User-Agent': HEADERS['User-Agent'],
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    Referer: `${TRUST_POSITIF_BASE}/`,
  };
  if (cookieHeader) postHeaders['Cookie'] = cookieHeader;

  const postRes = await axios.post<{ values?: Array<{ Domain?: string; Status?: string }> }>(
    `${TRUST_POSITIF_BASE}/Rest_server/getrecordsname_home`,
    body,
    {
      headers: postHeaders,
      timeout: 30000,
      validateStatus: () => true,
    },
  );

  if (postRes.status < 200 || postRes.status >= 300) {
    throw new Error(`Trust Positif returned HTTP ${postRes.status}`);
  }
  const values = postRes.data?.values;
  if (!Array.isArray(values)) {
    throw new Error('Trust Positif response invalid (no values array)');
  }
  const normalized = values.map((row: { Domain?: string; Status?: string; domain?: string; status?: string }) => ({
    Domain: String((row.Domain ?? row.domain ?? '')).trim(),
    Status: String((row.Status ?? row.status ?? '')).trim(),
  }));
  return { values: normalized };
}

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  const orm = await MikroORM.init({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    dbName: process.env.POSTGRES_DB || 'backoffice-db',
    entities: [Domain, CpanelData],
    allowGlobalContext: true,
  });

  const em = orm.em.fork();
  const usedDomains = await em.find(
    Domain,
    { isUsed: true },
    { orderBy: { name: 'ASC' } },
  );
  const names = usedDomains.map((d) => d.name);
  await orm.close();

  if (names.length === 0) {
    console.log('No used domains in database. Mark domains as Used in the UI or via bulk upload.');
    const outPath = path.join(__dirname, '../..', 'trustpositif-data.txt');
    fs.writeFileSync(
      outPath,
      '# Trust Positif (Nawala) – no used domains in DB\n# Run refresh after marking domains as Used.\n{"values":[],"response":200}\n',
      'utf8',
    );
    console.log('Wrote', outPath);
    process.exit(0);
    return;
  }

  const allValues: Array<{ Domain: string; Status: string }> = [];
  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE);
    const result = await fetchTrustPositifForDomains(batch);
    allValues.push(...result.values);
    console.log(`Fetched batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.values.length} domains`);
  }

  const output = {
    values: allValues,
    response: 200,
    meta: { totalDomains: names.length, fetchedAt: new Date().toISOString() },
  };

  const outPath = path.join(__dirname, '../..', 'trustpositif-data.txt');
  const header = [
    '# Trust Positif (Nawala) – used domains from DB',
    `# Source: ${TRUST_POSITIF_BASE}/Rest_server/getrecordsname_home`,
    `# Domains (is_used=true): ${names.length}. Fetched: ${output.meta.fetchedAt}`,
    '# Status: "Tidak Ada" = not blocked, "Ada" = blocked.',
    '',
  ].join('\n');
  fs.writeFileSync(outPath, header + JSON.stringify(output, null, 2), 'utf8');
  console.log('Wrote', outPath, '–', allValues.length, 'rows');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
