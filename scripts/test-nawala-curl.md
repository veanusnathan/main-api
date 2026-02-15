# Test Nawala check (curl)

Backend endpoint: **POST `/domains/refresh-nawala`**  
Auth: **Bearer token** (JWT).  
Response: `{ "checked": number, "updated": number }`.

## 1. Get an access token (if you don’t have one)

```bash
# API uses global prefix /api
curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{\"username\":\"YOUR_USERNAME\",\"password\":\"YOUR_PASSWORD\"}"
```

Copy the `access_token` from the JSON response.

## 2. Call refresh-nawala

Replace `YOUR_ACCESS_TOKEN` and adjust `BASE_URL` if needed:

```bash
# API uses global prefix /api
curl -i -X POST "http://localhost:3000/api/domains/refresh-nawala" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Accept: application/json"
```

**Expected:** `200` or `201` and body like `{"checked":42,"updated":0}`.

- **401** = invalid or missing token.
- **502** = Nawala/Trust Positif check failed (e.g. site unreachable or geo-blocked).

## 3. Frontend

The backoffice uses the same endpoint:

- **Hook:** `useRefreshNawalaMutation()` in `backoffice/src/features/domain/api/useRefreshNawalaMutation.ts`
- **Request:** `POST {VITE_API_URL}/domains/refresh-nawala` with `Authorization: Bearer <token>` (via `axiosWithToken`). Ensure `VITE_API_URL` points at the API root (e.g. `http://localhost:3000/api`) so the request hits the backend.
- **UI:** Domain list page → shield icon “Nawala (every 15 min)” → click runs the mutation, shows “Nawala check: X checked, Y updated” on success.

No body required for the request.
