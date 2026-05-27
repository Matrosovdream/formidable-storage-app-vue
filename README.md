# formidable-storage-app-vue

Vue 3 + Vite SPA for the Formidable Storage dashboard — manage sites, view incoming form entries, and track email/entry activity. Dockerized for both local development (Vite dev server with HMR) and production (static build served by nginx behind Traefik).

## Demo login

```
admin@admin.com
123123
```

## Tech stack

- Vue 3 (Composition API) + Vite 6
- Pinia (state) + vue-router 4
- Tailwind CSS 4
- axios (bearer-token auth)
- Docker + Traefik for deploys

---

> ### Backend API
>
> The frontend talks to one of two interchangeable backend implementations (same API surface, different languages — built for performance comparison):
>
> - **Go** — [Matrosovdream/formidable-storage-app-golang](https://github.com/Matrosovdream/formidable-storage-app-golang)
> - **Rust** — [Matrosovdream/formidable-storage-app-rust](https://github.com/Matrosovdream/formidable-storage-app-rust) *(vibecoded for performance review)*

---

## Prerequisites

- Docker + Docker Compose
- A `.env` file at the repo root — copy from `.env.example`:
  ```bash
  cp .env.example .env
  ```

Key variables (see `.env.example` for the full list):

| Variable | Used by | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | dev + prod | Backend API base URL. In prod, baked into the bundle at build time. |
| `APP_NAME` | dev + prod | Image/container name; also Traefik router/service slug in prod. |
| `DEV_PORT` | dev | Host port for the Vite dev server (default `7070`). |
| `APP_HOST` | prod | Public hostname Traefik matches (e.g. `app.example.com`). |
| `TRAEFIK_CERTRESOLVER` | prod | Traefik certresolver name (default `letsencrypt`). |

Prod also requires an external Docker network named `traefik-network` (created by your Traefik setup).

## Run — development

Source-mounted, HMR via Vite:

```bash
docker compose -f compose.dev.yaml up --build
```

Then open <http://localhost:7070> (or whatever `DEV_PORT` you set).

To stop:

```bash
docker compose -f compose.dev.yaml down
```

## Run — production

Builds the static bundle and serves it with nginx; Traefik handles TLS and routing.

```bash
docker compose -f compose.prod.yaml up -d --build
```

The app will be reachable at `https://${APP_HOST}` once Traefik picks up the labels.

To stop:

```bash
docker compose -f compose.prod.yaml down
```

## Pull updates

From the repo root:

```bash
git pull
```

Then rebuild the relevant environment:

```bash
# dev
docker compose -f compose.dev.yaml up -d --build

# prod
docker compose -f compose.prod.yaml up -d --build
```

`--build` is important — without it Compose will reuse the cached image and your changes won't be picked up. For prod, because `VITE_API_BASE_URL` is baked in at build time, any change to that variable also requires a rebuild.
