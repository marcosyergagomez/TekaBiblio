# 📚 TekaBiblio

Gestor de Biblioteca desarrollado como proyecto educativo/profesional. Permite administrar **materiales**, **ejemplares**, **préstamos**, **reservas**, **salas/puestos**, **eventos** y **multas** en una red de bibliotecas.

> Monorepo con **pnpm workspaces**: `apps/api` (NestJS) y `apps/web` (frontend).
> **Estado**: Bootstrap en progreso (día 1: base del repo y fundamentos).

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
- [Roadmap](#-roadmap)
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

## 🤝 Contribución
1. Crea una rama: `git checkout -b feature/mi-feature`  
2. Commits con **Conventional Commits**  
3. PR a `main` con descripción clara

---

## 📜 Licencia
[MIT](./LICENSE) © 2025 Marcos Yerga
