# TekaBiblio API

Backend NestJS para la plataforma TekaBiblio.

## Alcance

La API cubre los dominios MVP:
- autenticacion y sesiones
- catalogo y ejemplares
- prestamos y renovaciones
- reservas y envios entre sedes
- penalizaciones, pagos y auditoria
- reportes operativos

## Modulos

- `auth`: login, refresh, logout, perfil y validacion de token bearer
- `materials`: materiales y copias
- `loans`: prestamos, devoluciones, renovaciones y reglas de negocio
- `reservations`: reservas y shipment lifecycle
- `penalties`: gestion de sanciones
- `payments`: registro y consulta de pagos
- `audit`: trazabilidad de acciones de negocio
- `reports`: ingresos, perdidas, popularidad y dashboard
- `health`: disponibilidad del servicio
- `database`: acceso SQL con mysql2

## Requisitos

- Node.js >= 20 < 21
- pnpm (via Corepack)
- MySQL 8

## Configuracion

1. Instalar dependencias:

```bash
corepack enable
pnpm install
```

2. Preparar entorno:

```bash
copy .env.example .env
```

Variables principales:
- `PORT`: puerto API (default 3000)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`
- `JWT_SECRET` (obligatorio y seguro: >= 32 chars)
- `JWT_EXPIRES_IN` (default `8h`)
- `REFRESH_TOKEN_EXPIRES_DAYS` (default `14`)
- `DEMO_AUTH_PASSWORD`
- `ALLOW_DEMO_PASSWORD_AUTH` (default `0`)
- `ALLOW_INSECURE_HEADER_AUTH` (default `0`)
- `ALLOW_INSECURE_JWT_FOR_DEV` (default `0`)
- `ENABLE_SWAGGER` (default `0`)
- `AUTH_RATE_LIMIT_WINDOW_MS` (default `900000`)
- `AUTH_RATE_LIMIT_MAX` (default `30`)

## Ejecucion

```bash
pnpm run dev
```

Servicio por defecto:
- API: http://localhost:3000
- Health: http://localhost:3000/health
- Swagger: http://localhost:3000/api/v1 (habilitable por entorno)

## Autenticacion y autorizacion

### Modo recomendado (produccion y local)

- Login: `POST /auth/login`
- Usar `Authorization: Bearer <accessToken>` en endpoints privados
- Refresh con rotacion: `POST /auth/refresh`
- Logout por refresh token: `POST /auth/logout`
- Logout de todas las sesiones del usuario: `POST /auth/logout-all`
- Perfil del usuario autenticado: `GET /auth/me`

### Modo inseguro de cabeceras (solo pruebas/manual)

Deshabilitado por defecto. Requiere `ALLOW_INSECURE_HEADER_AUTH=1`.

Cabeceras aceptadas en ese modo:
- `x-user-id`
- `x-user-role`
- `x-branch-id`
- `x-member-id`

## Endpoints por dominio (resumen)

- `GET /health`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/me`
- `GET /materials`, `POST /materials`, `PATCH /materials/:materialId`, `DELETE /materials/:materialId`
- `GET /copies`, `POST /copies`, `PATCH /copies/:copyId/status`
- `GET /loans/policies`, `GET /loans`, `POST /loans`, `POST /loans/renew`, `POST /loans/return`, `POST /loans/late-fee`, `GET /loans/:loanId`
- `POST /reservations`, `GET /reservations`, `GET /reservations/:reservationId`, `POST /reservations/:reservationId/mark-ready`, `POST /reservations/expire-due`
- `GET /shipments`, `GET /shipments/:shipmentId`, `POST /shipments/:shipmentId/status`
- `GET /penalties`, `POST /penalties`, `POST /penalties/from-loan`, `POST /penalties/:penaltyId/waive`
- `GET /payments`, `POST /payments`
- `GET /audit-logs`
- `GET /reports/income`, `GET /reports/losses`, `GET /reports/popularity`, `GET /reports/dashboard`
- `GET /metrics`

Para contratos detallados, usar Swagger cuando este habilitado.

## Seguridad aplicada

- Helmet activo en bootstrap
- `x-powered-by` deshabilitado
- Rate limit en `/auth/login` y `/auth/refresh`
- CORS restringido a origenes locales definidos
- DTO validation global con `whitelist`, `transform` y `forbidNonWhitelisted`
- JWT obligatorio para rutas privadas (salvo modo inseguro explicitamente habilitado)

## Observabilidad

- Logs estructurados JSON en runtime.
- `x-request-id` para trazabilidad por request.
- Metricas Prometheus expuestas en `GET /metrics`.
- Contadores de fallos de autenticacion y latencia de peticiones para alertas minimas.

## Capa de datos

- Almacen principal: MySQL via `mysql2`.
- Si `NODE_ENV=test` o `DB_DISABLE=1`, el store SQL se desactiva.
- Algunos flujos (por ejemplo sesiones) pueden operar con fallback en memoria para test/local resiliente.

## Scripts utiles

```bash
pnpm run dev
pnpm run build
pnpm run start:prod
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run test:contract
```

## Calidad

Checklist recomendado antes de merge:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e
pnpm run test:contract
pnpm run build
```

## Troubleshooting rapido

- Error de JWT secret inseguro:
  - definir `JWT_SECRET` con al menos 32 caracteres
  - no usar secrets de ejemplo en entornos normales
- 401 en endpoints privados:
  - validar formato `Authorization: Bearer <token>`
  - comprobar expiracion y refresh del token
- Login demo falla:
  - habilitar `ALLOW_DEMO_PASSWORD_AUTH=1`
  - definir `DEMO_AUTH_PASSWORD`
