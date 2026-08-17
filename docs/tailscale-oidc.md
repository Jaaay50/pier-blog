# Tailscale OIDC Discovery

This document defines the public discovery endpoint used to create and maintain the `ethanpier.com` Tailscale tailnet with Auth0.

## Contract

- Endpoint: `https://ethanpier.com/.well-known/webfinger`
- Subject: `acct:ethan@ethanpier.com`
- Issuer: the exact `issuer` value returned by the configured Auth0 tenant's `/.well-known/openid-configuration`
- Media type: `application/jrd+json`
- Cache: public, five minutes
- Indexing: `X-Robots-Tag: noindex`
- CORS: `Access-Control-Allow-Origin: *`

The route is a fixed, single-account bootstrap endpoint. It publishes only the email-shaped subject and issuer URL. It does not publish or read Client IDs, Client Secrets, passwords, tokens, cookies, or browser session data.

## Architecture

1. Tailscale derives `https://ethanpier.com/.well-known/webfinger` from the signup email domain.
2. The Next.js route returns the fixed JRD from `src/app/.well-known/webfinger/route.ts`.
3. Tailscale reads the issuer URL, then uses the provider's standard OIDC discovery document.
4. The Auth0 application handles the callback at `https://login.tailscale.com/a/oauth_response`.

The endpoint is independent of the localized page router and must remain at the root `/.well-known` path.

## Change Procedure

When changing the administrator email or OIDC provider:

1. Confirm the new issuer from the provider's live `/.well-known/openid-configuration` document.
2. Update both `src/app/.well-known/webfinger/route.ts` and `src/app/.well-known/webfinger/route.test.ts`.
3. Keep the noindex source in `next.config.mjs` and the corresponding boundary assertions in `src/security-headers.test.ts`.
4. Run the focused tests, the full test suite, and a production build.
5. Deploy the same validated commit, then probe the production endpoint before changing Tailscale.
6. Configure provider credentials only in Auth0/Tailscale administrative surfaces; never add them to Git, docs, logs, screenshots, or memory.

## Verification

```bash
npm test -- src/app/.well-known/webfinger/route.test.ts src/security-headers.test.ts
npm test
npm run build
curl -i 'https://ethanpier.com/.well-known/webfinger?resource=acct:ethan@ethanpier.com'
curl -sS 'https://ISSUER/.well-known/openid-configuration'
```

Acceptance requires:

- HTTP 200 from the production WebFinger endpoint.
- A JRD subject matching the signup email and an issuer matching provider discovery exactly.
- `Content-Type: application/jrd+json`, five-minute cache headers, CORS, and `X-Robots-Tag: noindex`.
- Successful OIDC login through the Tailscale callback.

Creating a tailnet is not device onboarding. Device enrollment, ACL hardening, plan selection, and end-to-end connectivity remain separate acceptance steps.

## Rollback

- Application rollback: revert the WebFinger commit and deploy the resulting main commit.
- Deployment rollback: repoint the Vercel production alias to the last known-good deployment.
- Identity rollback: update the WebFinger issuer first, verify production discovery, then use Tailscale's identity-provider switching flow.

Do not remove or change the discovery endpoint before confirming whether the active tailnet still depends on it for an identity-provider transition.
