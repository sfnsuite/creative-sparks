# Security Overview

## Authorization model

- **Deny by default.** The admin surface (`/admin`, everything under
  `/_authenticated`) is gated by `getVerifiedAdmin()` in
  `src/lib/admin-auth.ts`.
- A valid Supabase session is **never** admin authorization on its own.
  Admin status is verified by calling the `public.has_role` SQL function,
  which is `STABLE SECURITY DEFINER` with an empty `search_path` and
  requires `auth.uid() = _user_id` in addition to a row in
  `public.user_roles` with `role = 'admin'`.
- Roles live in a separate `public.user_roles` table. Browser clients
  cannot assign roles; every RLS policy on that table scopes reads to the
  caller's own row and no policy grants insert/update/delete.
- Row-Level Security is the final authority for every table. RLS policies
  for `products`, `promo_cards`, `orders`, `custom_orders`, and
  `wholesale_leads` grant management to admins only, and grant strictly
  bounded INSERT rights to anon/authenticated for public forms.

## Public forms and inputs

- All public form submissions are bounded server-side by RLS `WITH CHECK`
  policies and by `CHECK` constraints on the tables (name/phone/address
  lengths, JSON shape/size limits, array cardinalities, non-negative
  numeric bounds, status must start as `'new'`).
- Client-side validation exists for UX only. Server bounds are
  authoritative.

## Promo click counter

- Anonymous clients never receive `UPDATE` on `public.promo_cards`.
- The counter uses `public.increment_promo_card_click(_card_id text)`, a
  `SECURITY DEFINER` function with `search_path = ''` and fully-qualified
  references that only bumps `click_count` by 1 for active cards, returns
  no private data, and has `EXECUTE` revoked from `PUBLIC` and granted
  only to `anon` and `authenticated`.

## HTTP security headers

Applied to every response in `src/server.ts`:

- `Content-Security-Policy` with `object-src 'none'`, `base-uri 'self'`,
  `frame-ancestors 'none'`, narrow allowed origins for the Supabase Data
  API/Realtime, Google Fonts, and inline scripts required by TanStack
  Start's hydration bootstrap.
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Cache-Control: no-store` for `/auth`, `/admin`, `/_authenticated/*`.

## Storage

- `product-images` bucket delivers public URLs (required by the current
  UI). Only admins can upload/update/delete via RLS on `storage.objects`.
- Client uploads: MIME allowlist (`image/jpeg`, `image/png`, `image/webp`,
  `image/avif`), 8 MiB max, path is
  `${user.id}/${crypto.randomUUID()}.<validated-ext>` — original filename
  extensions are never trusted.

## Repository secret hygiene

- `.env` is NOT tracked. `.gitignore` blocks `.env` and `.env.*` while
  allowing `.env.example`.
- The Supabase `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`
  values are **public client configuration**, not service-role secrets;
  the publishable key is safe to expose in browser code. Even so,
  repository config is environment-managed, not committed as literal
  values.
- Service-role keys, database passwords, and any other secrets must
  never appear in `VITE_*` variables, browser code, or committed files.

## Required manual production controls

These live in the Supabase and GitHub dashboards and are not automated in
this repository:

1. **Disable public sign-up** in Supabase Auth settings.
2. **Disable OAuth providers** that this app does not use (Google, Apple,
   etc.). This app uses email/password sign-in only.
3. **Create the admin user manually** and assign
   `public.user_roles.role = 'admin'` through a trusted channel (SQL
   editor with review). Never expose role assignment to the browser.
4. **Require MFA** for administrators via Supabase Auth.
5. **Enable branch protection** on `main`: required PR reviews, required
   status checks (Quality Gate, CodeQL), linear history, no force-push.
6. **Enable secret scanning + push protection** on the GitHub repo.
7. **Configure the `product-images` bucket** in the Supabase dashboard
   with an 8 MiB file size limit and MIME allowlist
   (`image/jpeg,image/png,image/webp,image/avif`). The storage
   management tools exposed here do not accept those parameters; enforce
   them in the dashboard.
8. **Rate-limit public forms and the promo click endpoint** at the edge
   (Cloudflare/Vercel/Supabase) and add CAPTCHA before running paid ads
   to `/c/:cardId`, `/custom`, `/wholesale`, and product order forms.
9. **Session storage:** the auto-generated Supabase browser client uses
   `localStorage` for session persistence and cannot be edited here. If
   your threat model requires session tokens to be scoped to a single
   tab, switch the browser client to `sessionStorage` in its managed
   configuration.
