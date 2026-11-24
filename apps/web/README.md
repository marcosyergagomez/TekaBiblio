# TekaBiblio Web

Frontend React de TekaBiblio para operaciones de catalogo, perfil de usuario y flujos de staff.

Fecha de revision: 2026-04-14.

## Alcance funcional

- Login y gestion de sesion con access/refresh token.
- Navegacion por rol (socio y staff).
- Catalogo con filtros y consultas paginadas.
- Prestamos y reservas del usuario.
- Panel operativo para staff (materiales, prestamos, sanciones, pagos y dashboard).
- Internacionalizacion ES/EN con selector de idioma.

## Stack

- React 18 + TypeScript
- Vite 5
- React Router 7
- Axios
- i18next + react-i18next con recursos JSON
- ESLint + Vitest + Playwright

## Estructura relevante

```
apps/web/
├─ src/
│  ├─ components/
│  │  └─ LanguageSwitcher.tsx
│  ├─ lib/
│  │  ├─ api.ts
│  │  └─ auth.ts
│  ├─ locales/
│  │  ├─ es.json
│  │  └─ en.json
│  ├─ features/
│  │  ├─ catalog/CatalogPage.tsx
│  │  ├─ profile/ProfilePage.tsx
│  │  ├─ loans/MyLoansPage.tsx
│  │  ├─ reservations/MyReservationsPage.tsx
│  │  └─ staff/StaffOpsPage.tsx
│  ├─ App.tsx
│  ├─ i18n.ts
│  └─ main.tsx
├─ nginx.conf
├─ vite.config.ts
└─ package.json
```

## Requisitos

- Node.js >= 20 < 21
- pnpm via Corepack

## Configuracion

1. Instalar dependencias desde la raiz del monorepo:

```bash
corepack enable
pnpm install
```

2. Definir URL de API en entorno local:

```env
VITE_API_URL=http://localhost:3000
```

Si no se define, el frontend usa `http://localhost:3000` como fallback.

## Ejecucion

Desde la raiz:

```bash
pnpm dev:web
```

O desde este paquete:

```bash
pnpm dev
```

URL por defecto: http://localhost:5173

## Scripts del paquete

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm test
pnpm test:cov
pnpm test:e2e
```

## Autenticacion en cliente

- La sesion vive en sessionStorage: sobrevive a recargar la pestana y muere al cerrarla. Un script de este origen puede leerla, asi que no equivale a una cookie httpOnly. localStorage se descarto porque el token sobreviviria al cierre del navegador.
- Axios inyecta `Authorization: Bearer <accessToken>` en cada request autenticada.
- En respuestas 401, se intenta refresh una sola vez y se reintenta la peticion original.
- Si el refresh falla, se limpia sesion local y el usuario debe autenticarse de nuevo.

Implicacion operativa:
- Al cerrar la pestana, la sesion desaparece y hace falta entrar de nuevo.

## Internacionalizacion

- Recursos en `src/locales/es.json` y `src/locales/en.json`.
- Inicializacion en `src/i18n.ts`.
- El idioma seleccionado se persiste como preferencia en localStorage bajo la clave `tekabiblio.lang`.

## Seguridad frontend

- Build de produccion servido por nginx con cabeceras de seguridad en `nginx.conf`.
- CSP definida en nginx para restringir scripts, frames y origenes de conexion.
- El frontend no habilita almacenamiento persistente de tokens.
- Verificacion automatizada de baseline CSP en `scripts/security/check-csp.mjs`.

## Integracion con backend

Para un flujo funcional completo:

1. Levantar API y base de datos.
2. Verificar `VITE_API_URL` apuntando a la API.
3. En entorno demo, habilitar en API si aplica:
   - `ALLOW_DEMO_PASSWORD_AUTH=1`
   - `DEMO_AUTH_PASSWORD=<password-demo>`

## Troubleshooting

- Error de CORS o red:
  - confirmar que API responde en la URL configurada en `VITE_API_URL`
  - validar que CORS de API incluye el origen web activo
- 401 recurrente en frontend:
  - revisar expiracion de tokens y endpoint `/auth/refresh`
  - comprobar que la API tiene `JWT_SECRET` valido
- Login demo falla:
  - revisar flags y password de demo en entorno API

## Criterio de calidad antes de merge

Ejecutar desde la raiz del repo:

```bash
corepack pnpm -C apps/web lint
corepack pnpm -C apps/web typecheck
corepack pnpm -C apps/web test
corepack pnpm -C apps/web test:e2e
corepack pnpm -C apps/web build
```
