# Guia Final de Demo (5-8 minutos)

Fecha: 2026-04-12
Objetivo: mostrar el proyecto completo de forma reproducible para reclutadores.

## 1. Arranque rapido
1. `pnpm install`
2. `docker compose up -d`
3. `pnpm dev`
4. Abrir:
- API: http://localhost:3000/docs
- Web: http://localhost:5173

## 2. Credenciales demo
- Admin Global: `admin.global@tekabiblio.local` / `Demo12345!`
- Admin Sede: `admin.norte@tekabiblio.local` / `Demo12345!`
- Bibliotecario: `biblio.norte@tekabiblio.local` / `Demo12345!`
- Socio Oro: `socio.oro@tekabiblio.local` / `Demo12345!`

## 3. Flujo recomendado de presentacion
### 3.1 Seguridad y sesion
1. Login en web.
2. Mostrar perfil actual (rol, sede, memberId).
3. Mostrar soporte JWT refresh/logout-all.

### 3.2 Catalogo y operaciones staff
1. Ir a Catalogo y aplicar busqueda.
2. Ir a Operativa staff:
- Alta de material.
- Edicion de material.
- Checkout de prestamo.

### 3.3 Penalizaciones y pagos
1. Registrar penalizacion manual.
2. Registrar pago asociado a penalizacion.
3. Verificar en API:
- `GET /penalties`
- `GET /payments`

### 3.4 Reportes y auditoria
1. Cargar dashboard en web (KPIs).
2. En API mostrar:
- `GET /reports/income`
- `GET /reports/losses`
- `GET /reports/popularity`
- `GET /audit-logs`

## 4. Puntos tecnicos a destacar
- Backend Nest modular con DTO + validacion global.
- Guardas de roles + alcance por sede + alcance por socio.
- Persistencia SQL con fallback in-memory para tests.
- Auth con access/refresh + rotacion + revocacion global.
- CI en GitHub Actions: lint + typecheck + unit + e2e.
- Release automatizado con artifacts e imagenes GHCR.

## 5. Cierre de demo
1. Ejecutar tests:
- `pnpm -C apps/api test -- --runInBand`
- `pnpm -C apps/api test:e2e`
2. Mostrar workflow de CI en `.github/workflows/ci.yml`.
3. Mostrar workflow de release en `.github/workflows/release.yml`.
