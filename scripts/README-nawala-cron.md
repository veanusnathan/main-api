# Nawala cron script

When the main-api process cannot reach Trust Positif (e.g. "Connection refused" from PM2 while curl works from the shell), run this script from **cron** so curl runs outside the app and can use the VPN.

## Setup (on the VPS)

1. **In main-api `.env`** add (use a long random string):
   ```env
   NAWALA_CRON_SECRET=your-secret
   ```
   Optional: to stop the in-app scheduled Nawala job from failing every 15 minutes:
   ```env
   TRUST_POSITIF_SKIP_SCHEDULED=1
   ```
   Then: `pm2 restart main-api`.

2. **Install jq:** `apt-get install -y jq`

3. **Make the script executable:**
   ```bash
   chmod +x /var/app/main-api/scripts/nawala-cron.sh
   ```

4. **Run once by hand** (VPN must be up):
   ```bash
   NAWALA_CRON_SECRET=your-secret /var/app/main-api/scripts/nawala-cron.sh
   ```
   You should see: `Nawala cron: checked N domains, apply response: {"checked":...,"updated":...}`.

5. **Add to crontab** (e.g. every 6 hours). Run `crontab -e`:
   ```cron
   0 */6 * * * NAWALA_CRON_SECRET=your-secret /var/app/main-api/scripts/nawala-cron.sh >> /var/log/nawala-cron.log 2>&1
   ```
   If the API is not at `http://127.0.0.1`, set `NAWALA_CRON_API_URL` (e.g. `http://127.0.0.1:3000`).

## Env vars (optional)

- `NAWALA_CRON_API_URL` – main-api base URL (default `http://127.0.0.1`)
- `TRUST_POSITIF_BASE` – Trust Positif URL (default `https://182.23.79.198`)
- `TRUST_POSITIF_HOST` – Host header (default `trustpositif.komdigi.go.id`)

The script is in the main-api repo; deploy with `git pull` in `/var/app/main-api`.
