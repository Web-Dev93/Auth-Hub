---
name: OAuth callback URL pattern
description: Every OAuth provider needs a hardcoded production callback URL env var — never rely on REPLIT_DEV_DOMAIN in production.
---

# OAuth Callback URL Pattern

## The rule
When adding a new OAuth provider, **immediately** set a `<PROVIDER>_CALLBACK_URL` environment variable pointing to the production URL (e.g. `https://auth-manager-hub.replit.app/api/auth/<provider>/callback`). Do NOT rely on `REPLIT_DEV_DOMAIN` — it resolves to the dev domain which differs from production and causes "domain not included in app domains" errors from providers like Google and Facebook.

**Why:** This mistake was made twice — once with Google, once with Facebook. Both times the fix was the same: set the explicit production callback URL in Replit Secrets/env vars. The dynamic `REPLIT_DEV_DOMAIN` approach only works in dev and breaks in production OAuth flows.

**How to apply:** For every new OAuth provider added to `artifacts/api-server/src/lib/passport.ts`, build the fallback callback URL using `REPLIT_DOMAINS?.split(",")[0] || REPLIT_DEV_DOMAIN` — never `REPLIT_DEV_DOMAIN` alone. `REPLIT_DOMAINS` resolves to the production domain in deployed environments; `REPLIT_DEV_DOMAIN` resolves to the dev tunnel domain and breaks production OAuth flows.
