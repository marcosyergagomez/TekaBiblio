# 📚 TekaBiblio

Gestor de Biblioteca desarrollado como proyecto educativo/profesional. Permite administrar **materiales**, **ejemplares**, **préstamos**, **reservas**, **salas/puestos**, **eventos** y **multas** en una red de bibliotecas.

> Monorepo con **pnpm workspaces**: `apps/api` (NestJS) y `apps/web` (frontend).
> **Estado**: MVP funcional completo para demo (API + Web + CI + Release).

---

## 📖 Índice
- [Descripción](#-descripción)
- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Variables de entorno](#-variables-de-entorno)
- [Scripts](#-scripts)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Desarrollo](#-desarrollo)
- [Producción local](#-producción-local)
- [Pruebas](#-pruebas)
- [Release y Deploy](#-release-y-deploy)
- [Roadmap](#-roadmap)
- [Biblia del proyecto](#-biblia-del-proyecto)
- [Contribución](#-contribución)
- [Licencia](#-licencia)

---

## 📝 Descripción
TekaBiblio es una aplicación web full-stack para gestionar la actividad diaria de una biblioteca:
- Catálogo de **materiales** y **ejemplares**.
- **Préstamos**, **devoluciones** y **renovaciones** con reglas de negocio.
- **Reservas** de materiales con **cola** y caducidad.
- **Salas/puestos** con control de **aforo** y **horarios**.
- **Eventos** con inscripción.
- **Multas** por retrasos/daños.
- **Reportes** (préstamos, ocupación, sanciones).

---

## ✨ Características
- Roles: **socio**, **bibliotecario**, **admin** (RBAC).
- Documentación API con **Swagger**.
- Validación estricta de DTOs (TypeScript).
- Logger estructurado (**Pino**).
- Seguridad: Rate-limit, CORS y Helmet.
- Seeds de datos (cuando se integre Prisma).

---

## 🚀 Tecnologías
- **Backend**: NestJS + TypeScript  
- **DB**: MySQL 8 (InnoDB, `utf8mb4_0900_ai_ci`) + Prisma ORM  
- **Auth**: JWT (access + refresh)  
- **Cache/Colas**: Redis (BullMQ)  
- **API Docs**: Swagger / OpenAPI  
- **Testing**: Jest (unit, integration, e2e)  
- **Infra**: Docker & Docker Compose  
- **CI/CD**: GitHub Actions  
- **Gestor de paquetes**: pnpm (workspaces)

---

## ✅ Requisitos previos
**Node.js 20 LTS** (recomendado con nvm-windows / nvm)

**pnpm** (global):
```bash
npm i -g pnpm
```

**Docker y Docker Compose**

---

## ⚙️ Instalación

1) Clona el repositorio:
```bash
git clone https://github.com/MarcosYerga/TekaBiblio.git
cd TekaBiblio
```

2) (Opcional) Crea la estructura monorepo si aún no existe:
```bash
# Backend NestJS
pnpm dlx @nestjs/cli new apps/api --package-manager=pnpm

# Frontend (ejemplo Vite + React + TS)
pnpm dlx create-vite apps/web --template react-ts
```

3) Instala dependencias (root + apps):
```bash
pnpm install
```

4) Levanta servicios base con Docker (MySQL/Redis/Adminer):
```bash
docker compose up -d
```

> MySQL inicializa automaticamente esquema y seed desde `apps/api/database/schema-v1.sql` y `apps/api/database/seed-v1.sql` en el primer arranque (volumen vacio).
>
> Si ya tenias un volumen MySQL creado antes de `auth_sessions`, aplica la migracion incremental:
> `docker compose exec db sh -lc "mysql -uroot -p${MYSQL_ROOT_PASSWORD:-root} ${MYSQL_DATABASE:-tekabiblio} < /docker-entrypoint-initdb.d/migrations/2026-04-11-auth-sessions.sql"`

---

## 🔐 Variables de entorno

**apps/api/.env**
```env
NODE_ENV=development
PORT=3000

# Base de datos (Prisma)
DATABASE_URL="mysql://dev:dev@localhost:3306/biblioteca"

# Auth
JWT_SECRET="cambia-esto-por-un-secreto-seguro"
JWT_REFRESH_SECRET="cambia-esto-por-otro-secreto"

# Redis
REDIS_URL="redis://localhost:6379"
```

**apps/web/.env**
```env
VITE_API_URL=http://localhost:3000
```

> No subas ficheros `.env` al repositorio.

---

## 🧰 Scripts

### Root (orquestación)
```bash
pnpm dev               # Arranca api + web en paralelo (si existen)
pnpm dev:api           # Solo backend
pnpm dev:web           # Solo frontend

pnpm build             # Build de api + web
pnpm start:prod        # Arranca backend compilado
pnpm start:prod:both   # Backend + preview del front

pnpm lint              # ESLint en todos los paquetes
pnpm format            # Prettier
pnpm typecheck         # TypeScript sin emitir
pnpm test              # Tests unitarios
pnpm test:e2e          # Tests e2e del backend
```

### API (NestJS) — `apps/api/package.json`
```bash
pnpm -C apps/api dev
pnpm -C apps/api build
pnpm -C apps/api start:prod

pnpm -C apps/api lint
pnpm -C apps/api format
pnpm -C apps/api typecheck

pnpm -C apps/api test
pnpm -C apps/api test:cov
pnpm -C apps/api test:e2e

# (cuando integremos Prisma)
pnpm -C apps/api db:migrate
pnpm -C apps/api db:deploy
pnpm -C apps/api db:seed
```

### WEB (Vite) — `apps/web/package.json`
```bash
pnpm -C apps/web dev
pnpm -C apps/web build
pnpm -C apps/web preview

pnpm -C apps/web lint
pnpm -C apps/web format
pnpm -C apps/web typecheck
pnpm -C apps/web test
```

---

## 🗂 Estructura del proyecto
```
TekaBiblio/
├─ apps/
│  ├─ api/              # NestJS (backend)
│  └─ web/              # Vite/React (frontend)
├─ .npmrc               # Config pnpm recomendada
├─ pnpm-workspace.yaml  # Workspaces (apps/*)
├─ docker-compose.yml   # MySQL/Redis/Adminer
├─ package.json         # Scripts orquestadores
└─ README.md
```

**pnpm-workspace.yaml**
```yaml
packages:
  - 'apps/*'
```

**.npmrc** (recomendado)
```ini
save-exact=true
auto-install-peers=true
strict-peer-dependencies=false
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=@types/*
public-hoist-pattern[]=@nestjs/cli
fetch-timeout=60000
fetch-retries=3
```

---

## 🧪 Desarrollo
```bash
docker compose up -d   # servicios de datos
pnpm dev               # levanta api + web
```
- API: http://localhost:3000  
- Swagger: http://localhost:3000/docs  
- Web: http://localhost:5173

### Autenticacion en desarrollo (headers)
Los endpoints privados del API usan guardas por headers en modo desarrollo:
- `x-user-id`
- `x-user-role` (`admin_global`, `admin_sede`, `bibliotecario`, `socio`, `invitado`)
- `x-branch-id` (obligatorio para `admin_sede` y `bibliotecario` en operaciones con alcance de sede)
- `x-member-id` (obligatorio para rol `socio` en endpoints privados con alcance por miembro)

Alternativa recomendada: autenticacion JWT por bearer token.
- Login: `POST /auth/login` con body `{ "email": "...", "password": "Demo12345!" }`
- Header en privados: `Authorization: Bearer <accessToken>`
- Refresh: `POST /auth/refresh` con body `{ "refreshToken": "..." }` (rota refresh token)
- Logout: `POST /auth/logout` con body `{ "refreshToken": "..." }` (revoca sesion)
- Logout global: `POST /auth/logout-all` con bearer token (revoca todas las sesiones activas del usuario)
- Perfil actual: `GET /auth/me` con bearer token

Variables recomendadas para JWT:
- `JWT_SECRET` (default desarrollo: `dev-secret-change-me`)
- `JWT_EXPIRES_IN` (default: `8h`)
- `REFRESH_TOKEN_EXPIRES_DAYS` (default: `14`)

Endpoints utiles para demo MVP:
- Catalogo paginado: `GET /materials?page=1&pageSize=20&q=dune&materialType=LIBRO&homeBranchId=branch_centro&availableOnly=true`
- Ejemplares paginados: `GET /copies?page=1&pageSize=20&materialId=...&branchId=...&status=AVAILABLE`
- Actualizar material: `PATCH /materials/:materialId`
- Eliminar material: `DELETE /materials/:materialId` (solo si no tiene ejemplares)
- Reporte ingresos: `GET /reports/income`
- Reporte perdidas: `GET /reports/losses`
- Reporte popularidad: `GET /reports/popularity?limit=5`
- Dashboard ejecutivo: `GET /reports/dashboard`

---

## 🏁 Producción local
```bash
pnpm build
pnpm start:prod             # solo backend
pnpm start:prod:both        # backend + preview estático del front
```

---

## 🧪 Pruebas
- API (unit/integration): `pnpm -C apps/api test`  
- API (e2e): `pnpm -C apps/api test:e2e`  
- Web (si usas Vitest): `pnpm -C apps/web test`

> En CI: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

---

## 🚢 Release y Deploy
- CI continua: `.github/workflows/ci.yml` (lint + typecheck + unit + e2e).
- Release automatizado: `.github/workflows/release.yml`.
- Build y push de imagenes:
  - `ghcr.io/<owner>/tekabiblio-api`
  - `ghcr.io/<owner>/tekabiblio-web`
- Dockerfiles de produccion:
  - `apps/api/Dockerfile`
  - `apps/web/Dockerfile`
- Guia de release/deploy: `docs/DEPLOY_RELEASE.md`.

---

## 🗺️ Roadmap
- [ ] Bootstrap NestJS (Pino, Helmet, CORS, Throttler, Swagger, `/health`)
- [ ] Docker Compose (MySQL, Redis, Adminer)
- [ ] Prisma: schema inicial + migraciones + seeds
- [ ] Users + Auth (JWT access/refresh)
- [ ] Materials/Copies/Loans/Reservations
- [ ] Rooms/Seats + Events
- [ ] Multas + reportes
- [ ] CI (GitHub Actions)
- [ ] Deploy (Render/Railway + Vercel/Netlify)

---

## 📘 Biblia del proyecto
- Documento vivo de alcance, logica de negocio y roadmap: [`docs/BIBLIA_PROYECTO_v2.md`](docs/BIBLIA_PROYECTO_v2.md)
- Backlog tecnico por sprints (API y Web): [`docs/BACKLOG_TECNICO_SPRINTS.md`](docs/BACKLOG_TECNICO_SPRINTS.md)
- Guia final de demo (script para recruiters): [`docs/GUIA_DEMO_FINAL.md`](docs/GUIA_DEMO_FINAL.md)
- Guia de release/deploy automatizado: [`docs/DEPLOY_RELEASE.md`](docs/DEPLOY_RELEASE.md)
- Esquema inicial de base de datos (SQL): [`apps/api/database/schema-v1.sql`](apps/api/database/schema-v1.sql)
- Esquema inicial de base de datos (guia): [`docs/DB_SCHEMA_INICIAL.md`](docs/DB_SCHEMA_INICIAL.md)
- Matriz de permisos MVP: [`docs/MATRIZ_PERMISOS_MVP.md`](docs/MATRIZ_PERMISOS_MVP.md)
- Reglas directas API/frontend: [`docs/REGLAS_NEGOCIO_API_FRONTEND.md`](docs/REGLAS_NEGOCIO_API_FRONTEND.md)
- Seed demo para recruiters: [`docs/seed/seed-demo-mvp.json`](docs/seed/seed-demo-mvp.json)

---

## 🤝 Contribución
1. Crea una rama: `git checkout -b feature/mi-feature`  
2. Commits con **Conventional Commits**  
3. PR a `main` con descripción clara

---

## 📜 Licencia
[MIT](./LICENSE) © 2025 Marcos Yerga
