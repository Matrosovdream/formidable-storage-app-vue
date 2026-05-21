# Formidable Storage App — Vue SPA Build Plan

Standalone Vue 3 SPA that replicates the reference template ([project-reference/original/](../project-reference/original/)) and talks to the Go backend documented in [backend-api/openapi.yaml](../backend-api/openapi.yaml).

---

## 1. Goals & scope

- **Same pages, same flows** as the reference: Login, Register, Dashboard, Sites (list / add / view / edit), Data (entries list / entry details).
- **No Laravel.** Pure Vue 3 + Vite SPA. Backend lives elsewhere at `http://localhost:8080` in dev.
- **Bearer-token auth** (Sanctum-style `<id>|<plaintext>` from `/api/login`) stored in `localStorage` and attached via axios interceptor.
- **Tailwind** styling (migrated from the reference's Bootstrap markup).
- **Dockerized** for dev + prod, **Traefik-ready** for cloud deploys.

Out of scope for v1: REST v1 routes (`/rest/v1/*` are site-token endpoints used by external integrations, not the dashboard UI).

---

## 2. Tech stack

| Concern        | Choice                                            |
| -------------- | ------------------------------------------------- |
| Framework      | Vue 3 (`<script setup>`, Composition API)         |
| Build          | Vite 6                                            |
| Routing        | vue-router 4                                      |
| State          | Pinia (auth store + minimal UI state)             |
| HTTP           | axios 1.x with interceptors                       |
| Styling        | Tailwind CSS 4 (via `@tailwindcss/vite`)          |
| Forms / validation | Native HTML5 + a thin `useForm` composable    |
| Testing        | Vitest + @vue/test-utils + jsdom                  |
| Lint / format  | ESLint (vue3-recommended) + Prettier              |
| Container      | Multi-stage Dockerfile, served by nginx in prod   |
| Orchestration  | `compose.dev.yaml`, `compose.prod.yaml`           |
| Reverse proxy  | Traefik labels on the prod service                |

---

## 3. Environment & config (the `.env` question)

Vite exposes only vars prefixed with `VITE_`. Use a single base-URL var:

```env
# .env (committed defaults)
VITE_API_BASE_URL=http://localhost:8080

# .env.local (gitignored, per-developer overrides)
# VITE_API_BASE_URL=http://api.staging.example.com
```

Files:

- `.env`               — committed dev default (`http://localhost:8080`)
- `.env.development`   — same, used by `vite dev`
- `.env.production`    — placeholder; real value injected at deploy time
- `.env.example`       — committed template documenting every var
- `.env.local`         — gitignored, dev overrides

Consumed in the axios bootstrap:

```js
// src/api/http.js
import axios from 'axios';
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});
```

`.gitignore` additions: `.env.local`, `.env.*.local`.

---

## 4. Auth strategy

**Old reference (cookie/CSRF):** `axios.get('/sanctum/csrf-cookie')` then `withCredentials: true` cookies. **Drop this entirely** — the Go backend doesn't use it.

**New:**

1. `POST /api/login` → response `{ user, token, message }`. Store `token` in `localStorage` under `auth_token`. Cache `user` in Pinia (`useAuthStore`).
2. Axios request interceptor attaches `Authorization: Bearer <token>` to every request if a token is present.
3. Axios response interceptor: on `401`, clear the token + user and route to `/login`.
4. Router guard calls `GET /api/user` (which returns user *or* `null`, never 401). If `null` and route requires auth → redirect to `/login`. If user present and route is guest-only → redirect to `/dashboard`.
5. `POST /api/logout` then clear local state.

Auth store shape (Pinia):

```js
// src/stores/auth.js
state: { user: null, token: localStorage.getItem('auth_token') }
actions: { login(creds), register(payload), logout(), fetchUser() }
getters: { isAuthenticated }
```

---

## 5. Folder structure

```
src/
  api/
    http.js                  # axios instance + interceptors
    auth.js                  # login / register / logout / me
    sites.js                 # list / view / create / delete (+ form metadata)
    data.js                  # entries / updates / emails
  stores/
    auth.js                  # Pinia
  router/
    index.js                 # routes + beforeEach guard
    guards.js                # requiresAuth / guest helpers
  layouts/
    AuthLayout.vue
    DashboardLayout.vue
  components/
    layout/
      DashboardHeader.vue
      DashboardSidebar.vue
    ui/                      # small primitives (Button, Input, Modal, Spinner)
    tables/
      DataTable.vue          # generic table + sort headers + pagination footer
  pages/
    Login.vue
    Register.vue
    Dashboard.vue
    sites/
      SitesList.vue
      SiteAdd.vue
      SiteView.vue
      SiteEdit.vue
    data/
      DataEntries.vue
      DataEntryDetail.vue
  composables/
    useApi.js                # { data, error, loading, refetch }
    usePagination.js
    useToast.js
  utils/
    format.js                # formatNumber, formatDate
    errors.js                # normalize 422 error envelopes
  assets/
    css/tailwind.css
  App.vue
  main.js
index.html
```

---

## 6. Routes (1:1 with reference)

| Path                                       | Name                      | Meta             | Component                  |
| ------------------------------------------ | ------------------------- | ---------------- | -------------------------- |
| `/login`                                   | `login`                   | `guest`          | `pages/Login.vue`          |
| `/register`                                | `register`                | `guest`          | `pages/Register.vue`       |
| `/dashboard`                               | `dashboard`               | `requiresAuth`   | `pages/Dashboard.vue`      |
| `/dashboard/sites`                         | `dashboard-sites`         | `requiresAuth`   | `pages/sites/SitesList.vue`|
| `/dashboard/sites/add`                     | `dashboard-site-add`      | `requiresAuth`   | `pages/sites/SiteAdd.vue`  |
| `/dashboard/sites/:site_id`                | `dashboard-site-view`     | `requiresAuth`   | `pages/sites/SiteView.vue` |
| `/dashboard/sites/:site_id/edit`           | `dashboard-site-edit`     | `requiresAuth`   | `pages/sites/SiteEdit.vue` |
| `/dashboard/data`                          | `dashboard-data`          | `requiresAuth`   | `pages/data/DataEntries.vue` |
| `/dashboard/data/:site_id/entry/:entry_id` | `dashboard-data-entry`    | `requiresAuth`   | `pages/data/DataEntryDetail.vue` |
| `/:pathMatch(.*)*`                         | catch-all                 | —                | redirect → `/login`        |

---

## 7. API client layer

One file per backend tag, all using the shared `http` instance.

**`src/api/auth.js`**

| Function              | Method | Endpoint           |
| --------------------- | ------ | ------------------ |
| `login(credentials)`  | POST   | `/api/login`       |
| `register(payload)`   | POST   | `/api/register`    |
| `me()`                | GET    | `/api/user`        |
| `logout()`            | POST   | `/api/logout`      |

**`src/api/sites.js`**

| Function                  | Method | Endpoint                       |
| ------------------------- | ------ | ------------------------------ |
| `list()`                                | GET    | `/api/sites/list`                                  |
| `view(siteId)`                          | GET    | `/api/sites/view/{site_id}`                        |
| `createFormMeta()`                      | GET    | `/api/sites/create`                                |
| `create(payload)`                       | POST   | `/api/sites/store`                                 |
| `remove(siteId)`                        | DELETE | `/api/sites/delete/{site_id}`                      |
| `generateEmails(siteId, params)`        | POST   | `/api/sites/generate/{site_id}/emails`             |
| `generateFields(siteId, params)`        | POST   | `/api/sites/generate/{site_id}/fields`             |
| `generateEntryUpdates(siteId, params)`  | POST   | `/api/sites/generate/{site_id}/entry-updates`      |

> Note: there is no `update` endpoint in the spec — the reference's "edit" page has nothing to PATCH against. See §9.

**`src/api/data.js`**

| Function                         | Method | Endpoint                                                    |
| -------------------------------- | ------ | ----------------------------------------------------------- |
| `entries(siteId, params)`        | GET    | `/api/data/entries/{site_id}`                               |
| `entryUpdates(siteId, entryId)`  | GET    | `/api/data/entries/{site_id}/{entry_id}/updates`            |
| `entryEmails(siteId, entryId)`   | GET    | `/api/data/entries/{site_id}/{entry_id}/emails`             |

---

## 8. Pages — what each one does

- **Login.vue** — email/password/remember form; on submit calls `auth.login()`, stores token, routes to `/dashboard`. Renders 422 field errors inline.
- **Register.vue** — name/email/password/confirmation; mirrors Login flow.
- **Dashboard.vue** — landing card "Welcome to your dashboard" + link tiles to Sites and Data.
- **SitesList.vue** — `GET /api/sites/list`, render cards with `SiteStats` (fields / emails / entry_history) and queue counts. "Add site", "View", "Delete" actions. Delete confirmation modal.
- **SiteAdd.vue** — name + url form, client-side URL validation, `POST /api/sites/store`, on success show the returned `token` (one-time reveal — it's a site REST token), then redirect to list.
- **SiteView.vue** — `GET /api/sites/view/{site_id}` → display id, name, url, token, stats (+ queue stats). Copy-token button.
- **SiteEdit.vue** — **see §9** (no backend support; either hide the route or make it a stub).
- **DataEntries.vue** — site tabs (from `sites.list`), entry-id filter, sortable columns (`entry_id`, `last_update`, `email_count`, `update_count`), pagination, row → details. Per-site **Actions** strip with `Generate emails / fields / entry updates` buttons; each opens a popup with the documented params (`amount`, plus `length` for emails) and renders the `GenerateResponse` (count + `generation_ms` / `insertion_ms` / `total_ms` timings).
- **DataEntryDetail.vue** — tabs: "Updates" (`/updates`) and "Emails" (`/emails`). Render tables matching API shape.

---

## 9. Reference vs. API mismatches (must fix while porting)

The reference SPA was written against a different/older backend. Don't copy its data-shape assumptions verbatim — port to the OpenAPI shapes:

| Where                             | Reference expects                              | API actually returns                                                          |
| --------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| `SiteView` ([DashboardSiteView.vue:25](../project-reference/original/resources/js/pages/DashboardSiteView.vue#L25)) | `data.data`                                    | The `SiteWithStats` object **directly** (no `data` wrapper)                   |
| `SitesList` stats ([DashboardSites.vue:53-70](../project-reference/original/resources/js/pages/DashboardSites.vue#L53-L70)) | `site.stats.frm.fields_count`, `…queue.queued_fields_count` | `site.stats.fields`, `site.stats.emails`, `site.stats.entry_history`, `site.stats.queue.{fields,emails,entry_history,shipment_history}` |
| `DataEntries` ([DashboardData.vue:55-57](../project-reference/original/resources/js/pages/DashboardData.vue#L55-L57)) | `data.data.items` + `data.data.pagination`     | Laravel paginator at top level: `{ current_page, last_page, per_page, total, data: [...] }` |
| `DataEntries` row fields ([DashboardData.vue:195-196](../project-reference/original/resources/js/pages/DashboardData.vue#L195-L196)) | `emails_count`, `updates_count`                | `email_count`, `update_count`                                                 |
| `DataEntryDetail` updates ([DashboardDataEntry.vue:25](../project-reference/original/resources/js/pages/DashboardDataEntry.vue#L25)) | `data.data.items` with nested `u.field.{label,key,type}` | `{ entry_id, updates: [...] }` where each update has flat `field_key`, `field_label` (no `field.type`) |
| `DataEntryDetail` emails ([DashboardDataEntry.vue:37](../project-reference/original/resources/js/pages/DashboardDataEntry.vue#L37)) | `data.data.items`                              | `{ data: [...] }` of `EmailLogItem`                                           |
| `SiteEdit`                        | Submits a PATCH/PUT                            | **No update endpoint exists in the spec.** Decision needed (§13).             |

Fix these in the new `src/api/*.js` layer — normalize there, not in components. Components consume already-normalized shapes.

---

## 10. Error handling

Single response interceptor + `utils/errors.js`:

```js
// utils/errors.js
export function parseApiError(err) {
  const env = err?.response?.data;
  if (env?.errors) return { fields: env.errors, message: env.message };
  if (env?.message) return { fields: {}, message: env.message };
  return { fields: {}, message: 'Unexpected error.' };
}
```

- `401` → auth store `logout()` + redirect to `/login`.
- `422` → component reads `parseApiError(err).fields` and shows per-field messages.
- `5xx` → toast "Server error, please retry."
- Network error → toast "Cannot reach server."

---

## 11. Dockerization

**`Dockerfile`** — multi-stage:

```dockerfile
# build
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`docker/nginx.conf`** — SPA fallback to `index.html` for client-side routing.

**`compose.dev.yaml`** — runs `npm run dev` with bind-mounted source for HMR; exposes Vite on `:5173`; sets `VITE_API_BASE_URL=http://localhost:8080`.

**`compose.prod.yaml`** — builds the prod image, attaches Traefik labels:

```yaml
services:
  web:
    image: formidable-storage-vue:latest
    labels:
      - traefik.enable=true
      - traefik.http.routers.fs-vue.rule=Host(`app.example.com`)
      - traefik.http.routers.fs-vue.entrypoints=websecure
      - traefik.http.routers.fs-vue.tls.certresolver=le
      - traefik.http.services.fs-vue.loadbalancer.server.port=80
    networks: [traefik]
networks:
  traefik:
    external: true
```

The `VITE_API_BASE_URL` is baked at build time (Vite inlines `import.meta.env.*`). For runtime override across environments, use a build-arg per environment OR a tiny `/config.js` runtime-shim served by nginx and read on app boot — pick one when we get to deploy time.

---

## 12. Testing strategy

- **Unit:** API client functions with `axios-mock-adapter` (response shapes match OpenAPI examples).
- **Component:** Login form happy path + 422 errors (port the existing [Login.spec.js](../project-reference/original/resources/js/pages/__tests__/Login.spec.js)). Sites list rendering. Pagination control.
- **Smoke:** router guard redirects (auth'd / unauth'd / wrong-state).
- No E2E in v1 — defer Playwright until prod-deploy story is stable.

---

## 13. Open questions (need decisions before / during build)

1. **`SiteEdit`** — backend has no update endpoint. Options: (a) hide the Edit button + route entirely, (b) keep the route as a read-only "Site settings" page, (c) request a `PATCH /api/sites/{id}` from backend team. Recommend (a) for v1.
2. **Site REST token reveal** — `POST /api/sites/store` returns the token once. Show it on a "Site created" success screen with a copy button + "this won't be shown again" warning? Or expose via `view`? (Spec says `view` *also* returns it, so we can re-display — confirm in dev.)
3. **Remember me** — login form has the checkbox but the API doesn't document any session-lifetime difference for tokens. Either drop the checkbox or wire it through and ignore on backend.
4. **CORS** — backend must allow the SPA's origin (`http://localhost:5173` dev, `https://app.example.com` prod) with `Authorization` header. Confirm with backend team.
5. **Runtime vs build-time `VITE_API_BASE_URL`** — see §11.

---

## 14. Build order (suggested PRs / phases)

1. **Bootstrap** — `npm create vite`, Tailwind, ESLint/Prettier, folder skeleton, `.env*` files, README. (Day 1)
2. **HTTP + auth core** — `src/api/http.js`, `src/stores/auth.js`, `src/api/auth.js`, router + guards, Login + Register pages, AuthLayout. (Day 1–2)
3. **Dashboard shell** — DashboardLayout, Header, Sidebar, empty Dashboard.vue. (Day 2)
4. **Sites** — SitesList, SiteAdd, SiteView, delete modal. Resolve §13.1 (SiteEdit). (Day 2–3)
5. **Data** — DataEntries (tabs, filter, sort, pagination) + DataEntryDetail (tabs). (Day 3–4)
6. **Polish** — toasts, loading skeletons, 401 redirect interceptor, format helpers, copy-token UX. (Day 4)
7. **Docker + Traefik** — Dockerfile, nginx config, compose files, deploy smoke. (Day 5)
8. **Tests** — port `Login.spec.js`, add API-client tests, add guard tests. (Day 5)

---

## 15. Definition of done

- Every reference page renders in the new app and round-trips data against `localhost:8080`.
- Bearer-token auth works: login → protected route → reload → still authed → logout → redirected.
- `npm run build` produces a working `dist/`; `docker compose -f compose.prod.yaml up` serves it via nginx behind Traefik.
- `npm run test` is green.
- Lint clean.
