# Traffic spike readiness

Plan for viral spikes (TikTok, Reddit, press) without match/chat falling over.

**Already deployed:** Cloudflare proxy, Turnstile on match, app rate limits, WAF rate rules.

---

## Capacity snapshot (rough)

| Concurrent users | Expected behavior |
|------------------|-------------------|
| ~50 | Smooth |
| ~100–200 | Slower matching, some 429s on shared IPs |
| ~300+ | Realtime connection limits (Supabase free ~200) bite hard |
| ~500+ queue-heavy | Match DB pressure; needs Pro + tuning below |

Video is **P2P** — it does not scale through Vercel. Bottlenecks are **match RPC**, **rate-limit RPC**, **Realtime connections**, and **Cloudflare per-IP rules**.

---

## Phase 1 — Done in code (deploy + monitor)

### Adaptive match polling
- Baseline poll **3s** (was 2s) for established users; **5s** for low rep.
- Server returns `pollIntervalMs` from global queue depth (up to **10s** when queue ≥ 300).
- Client **backoff** after consecutive waits (up to 10s).
- Client honors **429 Retry-After** from rate limits.

**Effect:** ~40–60% fewer `/api/match` calls under load.

### Cut redundant chat polls
- **Messages:** Realtime primary; HTTP fallback every **30s** (was 2s).
- **Room ended:** Realtime only; removed 2s `/api/room` poll (WebRTC disconnect still ends chat).
- **Video consent / connect status:** **5s** polls (was 2–3s).

**Effect:** ~70% fewer API calls per connected user.

---

## Phase 2 — Before a known spike (ops checklist)

### Supabase
- [ ] Upgrade to **Pro** if expecting 150+ concurrent (more DB compute + **500** Realtime connections default).
- [ ] Run `check-migrations.sql` — all ✅.
- [ ] In dashboard: watch **Database → Connections**, **Realtime**, query duration on `find_or_create_match`.

### Vercel
- [ ] Confirm **Pro** if you need higher serverless concurrency (Hobby can throttle bursts).
- [ ] Enable **Web Analytics** or use Sentry for 5xx / latency on `/api/match`.

### Cloudflare (Free plan: **one** rate rule)
Current combined rule should **not** block legitimate match polling:
- One user ≈ 12–20 `/api/match` per minute with adaptive polling (was ~30).
- Shared NAT (dorms): consider **45–60** match requests per 60s per IP, or exempt authenticated traffic later.

Recommended expression (adjust rate to taste):

```
(starts_with(http.request.uri.path, "/api/match")) or
(starts_with(http.request.uri.path, "/api/next")) or
(starts_with(http.request.uri.path, "/api/messages")) or
(starts_with(http.request.uri.path, "/api/auth"))
```

- **Match/next:** 45–60 requests / 60s / IP  
- **Messages:** 90–120 / 60s / IP (lower priority now that chat uses Realtime)

### TURN (Metered)
- [ ] Check Metered dashboard for concurrent TURN sessions if video fails for many users (NAT-heavy regions).
- [ ] Budget alert — TURN is per-GB, not per-user on your app server.

### Sightengine
- [ ] Report snapshots call Sightengine on each in-chat report — spike of reports = API cost; acceptable for safety.

---

## Phase 3 — If still struggling at 300+ concurrent

| Priority | Change | Impact |
|----------|--------|--------|
| 1 | **Supabase Pro** + connection pooler | DB stability |
| 2 | **Match via Realtime** — notify when pairing completes (push match to client, stop poll while waiting) | Largest match API reduction |
| 3 | Optimize `find_or_create_match` / index `waiting_users` by mode+region | DB CPU |
| 4 | Move rate limits to **Redis/Upstash** (optional) | Fewer DB RPCs per API hit |
| 5 | **Read replica** for admin/stats only | Offload reporting |

---

## Phase 4 — DDoS / bot swarm

- Cloudflare **Under Attack** mode (temporary).
- Turnstile already on match for new/low-trust accounts — tighten in `match-captcha` if needed.
- `npm run verify:cloudflare` + `npm run verify:smoke` after any WAF change.

---

## Monitoring during a spike

1. **Home** — queue feels long but no mass errors.
2. **`/api/health`** — `securityOk`, Supabase ok.
3. **Sentry** — spike in `/api/match` 500s or timeouts.
4. **Supabase** — connection count, slow queries on `find_or_create_match`.
5. **Admin** — report volume + AI snapshot queue.

---

## Quick math (after Phase 1)

| 200 users waiting | Before | After (approx) |
|-------------------|--------|----------------|
| `/api/match` / sec | ~100 | ~35–50 |
| 200 users in chat | ~380 API/s | ~120 API/s |

That roughly **doubles** comfortable concurrent capacity on the same Supabase tier.

---

## Rollback

If matching feels too slow after deploy:
- Lower `MATCH_POLL_MS_NORMAL` in `lib/match-polling.ts` (e.g. back to 2500).
- Reduce queue thresholds in `matchPollIntervalForQueue`.
