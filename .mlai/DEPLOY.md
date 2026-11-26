# AI provider, credits and billing (added 2026-11-26, updated same day)

## ML AI provider integration
- Real gateway: `https://api.ai.ml/v1` (OpenAI-compatible, `/models` + `/chat/completions`, SSE streaming with `stream_options.include_usage`). Do NOT use `api.ml.ai` — that host has no DNS; it only appears in doc examples.
- Auth: `Authorization: Bearer $MLAI_API_KEY` (in `.env.local`, gitignored). VERIFIED LIVE: `GET /v1/models` is PUBLIC — it returns 200 even with no/garbage key, so a 200 there proves nothing. `POST /v1/chat/completions` is the real test: the current key (`mlai_sk_…`, 48 chars) is rejected there with 401 "malformed API key" (code `key_invalid`). They issue `sk-aiml-live-…` keys. The key set on Vercel (prod `configured:true` since 2026-11-26) is rejected the same way — prod chat returns "Provider error 401". Fix = obtain a valid `sk-aiml-live-…` key and set it in Vercel env + `.env.local`, then redeploy.
- Until a valid key works, chat returns an honest 401-mapped SSE error and credits are refunded automatically (lib/credits.ts refund path).

## Central config
- Everything plan/model related lives in `lib/ai/config.ts` (registry + PLANS + PROMO_PERCENT=50). Billing engine: `lib/credits.ts` (hold → settle/refund inside DB transactions with `FOR UPDATE` row locks).
- DB: billing tables (`user_credits`, `credit_transactions`, `subscriptions`, `model_usage`, `billing_history`) created by `scripts/supabase-sync.mjs` (RLS enabled). Applied to local Postgres AND production Supabase on 2026-11-26.
- Payments: `/api/checkout` (Stripe Checkout, 50% promo applied to real amount) and `/api/webhooks/stripe` (HMAC-verified). Need `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` env vars to activate.
- Unlimited accounts: `user_credits.unlimited=1` → no balance displayed, usage still recorded.

## ZorkAI app notes
- Demo account for checks: `demo@demo.ai` / `demo1234`. Sign-in API: `POST /api/auth` JSON `{action:"login",email,password}`.
- Settings is a Grok-style modal; task-22 mobile fixes (composer wrapping, header icons) are in components/composer.tsx + model-selector.tsx — verify they are deployed before diagnosing UI from prod screenshots.
