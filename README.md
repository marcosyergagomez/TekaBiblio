# TekaBiblio

Monorepo de gestion bibliotecaria (MVP) con API en NestJS y frontend en React.

Estado actual:
- API y web funcionales para demo y desarrollo.
- Seguridad base aplicada (JWT bearer, validacion DTO, Helmet, rate limit en auth).
- Pipeline de calidad y seguridad continua (quality gate en CI, SAST, dependency review, audit de dependencias, check CSP).

## Arquitectura

```
TekaBiblio/
├─ apps/
│  ├─ api/    # NestJS + MySQL
│  └─ web/    # React + Vite
├─ docs/
├─ docker-compose.yml
├─ package.json
└─ pnpm-workspace.yaml
```

## Stack real (implementado)

- Backend: NestJS 11, TypeScript, mysql2
- Frontend: React 18, Vite 5, react-router-dom 7, i18next con JSON
- Base de datos: MySQL 8 (scripts SQL en `apps/api/database`)
- Infra local: Docker Compose (db, pma, api, web)
- Calidad: ESLint, TypeScript, Jest (API), Vitest (web)

La API usa MySQL como unica fuente de datos en runtime. El doble en memoria solo existe para tests unitarios y para DB_DISABLE=1, que el arranque de produccion rechaza. Redis ya no forma parte del entorno local.

## Requisitos

- Node.js >= 20 < 21
- Corepack habilitado (para pnpm)
- Docker + Docker Compose (recomendado para entorno completo)

## Inicio rapido

1. Clonar e instalar dependencias:

```bash
git clone https://github.com/marcosyergagomez/TekaBiblio.git
cd TekaBiblio
corepack enable
pnpm install
```

2. Preparar variables de entorno:

```bash
copy .env.example .env
copy apps\api\.env.example apps\api\.env
```

3. Levantar servicios de datos:

```bash
docker compose up -d db pma
```

4. Ejecutar API y web:

```bash
pnpm dev
```

Servicios por defecto:
- API: http://localhost:3000
- Health: http://localhost:3000/health
- Web: http://localhost:5173
- phpMyAdmin: http://localhost:8080
- Swagger: http://localhost:3000/api/v1 (solo si `ENABLE_SWAGGER=1` o `NODE_ENV!=production`)

## Variables de entorno clave

Archivo raiz (`.env`):
- `MYSQL_ROOT_PASSWORD`
- `MYSQL_DATABASE`
- `API_PORT`, `WEB_PORT`, `PMA_PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `REFRESH_TOKEN_EXPIRES_DAYS`
- `DEMO_AUTH_PASSWORD`
- `ALLOW_DEMO_PASSWORD_AUTH`
- `ALLOW_INSECURE_HEADER_AUTH`
- `ALLOW_INSECURE_JWT_FOR_DEV`
- `ENABLE_SWAGGER`
- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX`

Archivo API (`apps/api/.env`):
- `NODE_ENV`, `PORT`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`
- mismas variables de auth/hardening que en el archivo raiz

## Seguridad operativa

- Los endpoints privados requieren `Authorization: Bearer <token>`.
- El modo inseguro por cabeceras (`x-user-id`, `x-user-role`, etc.) esta deshabilitado por defecto y solo se habilita con `ALLOW_INSECURE_HEADER_AUTH=1` o en `NODE_ENV=test`.
- El login con password demo esta deshabilitado por defecto y requiere `ALLOW_DEMO_PASSWORD_AUTH=1`.
- `JWT_SECRET` debe tener al menos 32 caracteres y no permite defaults inseguros en runtime normal.
- Swagger se puede desactivar en produccion con `ENABLE_SWAGGER=0`.

## Verificacion de ciberseguridad

Controles automatizados implementados:
- Workflow de seguridad en `.github/workflows/security.yml` con dependency review, CodeQL, audit de dependencias y check CSP.
- Workflow de CI en `.github/workflows/ci.yml` con quality gate completo.
- Contratos de auth/permisos en `apps/api/test/auth-permissions.contract.e2e-spec.ts`.

Comandos de verificacion local recomendados:

```bash
pnpm security:audit
pnpm security:csp:check
pnpm -C apps/api test:contract
pnpm quality:gate
```

Para enforcement estricto en merge, configurar Branch Protection en GitHub y marcar los checks de CI/Security como obligatorios.

## Scripts principales

Root:

```bash
pnpm dev
pnpm dev:api
pnpm dev:web
pnpm build
pnpm lint
pnpm lint:md
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:e2e:web
pnpm quality:gate
pnpm ci
```

API:

```bash
pnpm -C apps/api dev
pnpm -C apps/api build
pnpm -C apps/api test
pnpm -C apps/api test:e2e
```

Web:

```bash
pnpm -C apps/web dev
pnpm -C apps/web build
pnpm -C apps/web test
pnpm -C apps/web test:e2e
```

## Calidad y validacion

Comando recomendado antes de merge:

```bash
pnpm lint
pnpm lint:md
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:e2e:web
pnpm build
```

## Documentacion del proyecto

Mapa canonicamente mantenido en:
- `docs/README.md`

Documentos de referencia frecuentes:
- `docs/BIBLIA_PROYECTO_v2.md`
- `docs/REGLAS_NEGOCIO_API_FRONTEND.md`
- `docs/MATRIZ_PERMISOS_MVP.md`
- `docs/DEPLOY_RELEASE.md`
- `docs/OPERACION_DATOS.md`
- `docs/OBSERVABILIDAD_SEGURIDAD_CONTINUA.md`

## Contribucion

1. Crear rama: `git checkout -b feature/nombre-cambio`
2. Seguir Conventional Commits
3. Abrir PR con cambios de codigo y documentacion sincronizados

## Licencia

MIT. Ver `LICENSE`.
