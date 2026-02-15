import { SetMetadata } from '@nestjs/common';

export const SKIP_IP_WHITELIST_KEY = 'skipIpWhitelist';

/** Marks a route as bypassing IP whitelist check (e.g. health, login, refresh). */
export const SkipIpWhitelist = () => SetMetadata(SKIP_IP_WHITELIST_KEY, true);
