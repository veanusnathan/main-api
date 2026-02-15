import { get } from 'env-var';
import { loadEnv } from './env';

loadEnv();

export const getRequired = (env: string) => get(env).required();

export const config = {
  get nodeEnv() {
    return getRequired('NODE_ENV').asEnum(['development', 'test', 'production']);
  },
  get postgresHost() {
    return getRequired('POSTGRES_HOST').asString();
  },
  get postgresPort() {
    return getRequired('POSTGRES_PORT').asPortNumber();
  },
  get postgresUser() {
    return getRequired('POSTGRES_USER').asString();
  },
  get postgresPassword() {
    return getRequired('POSTGRES_PASSWORD').asString();
  },
  get postgresDb() {
    const nodeEnv = getRequired('NODE_ENV').asEnum([
      'development',
      'test',
      'production',
    ]);
    const postgresDB = getRequired('POSTGRES_DB').asString();
    if (nodeEnv === 'test') {
      const jestWorkerId = getRequired('JEST_WORKER_ID').asInt();
      return `${postgresDB}_${jestWorkerId}`;
    }
    return postgresDB;
  },
  get namecheapApiUser() {
    return get('NAMECHEAP_API_USER').asString();
  },
  get namecheapApiKey() {
    return get('NAMECHEAP_API_KEY').asString();
  },
  get namecheapUserName() {
    return get('NAMECHEAP_USERNAME').asString();
  },
  get namecheapClientIp() {
    return get('NAMECHEAP_CLIENT_IP').asString();
  },
  get namecheapBaseUrl() {
    return get('NAMECHEAP_BASE_URL').asString() || 'https://api.namecheap.com/xml.response';
  },
  get jwtSecret() {
    return getRequired('JWT_SECRET').asString();
  },
  get jwtAccessExpiry() {
    return get('JWT_ACCESS_EXPIRY').asString() || '1h';
  },
  get jwtRefreshExpiry() {
    return get('JWT_REFRESH_EXPIRY').asString() || '7d';
  },
};
