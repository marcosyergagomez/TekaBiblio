# Observabilidad y Seguridad Continua

Fecha de revision: 2026-04-14.

## Observabilidad implementada

### Logs estructurados

- Logger JSON global en API.
- Cada request registra evento con:
  - `requestId`
  - metodo y ruta
  - estado HTTP
  - latencia en ms
  - contexto de usuario (cuando existe)

### Trazabilidad

- Se propaga/crea `x-request-id` por request.
- Se expone `x-request-id` en respuesta para correlacion frontend-backend.

### Metricas

Endpoint:
- `GET /metrics` (publico)

Metricas principales:
- `tekabiblio_http_request_duration_seconds`
- `tekabiblio_auth_failures_total`
- metricas base de proceso/runtime via `prom-client`

### Umbral de latencia

- Variable: `REQUEST_SLOW_THRESHOLD_MS`
- Requests por encima del umbral generan warning en logs.

## Alertas minimas recomendadas

Archivo de reglas:
- `ops/monitoring/prometheus-alerts.yml`

Reglas incluidas:
1. Tasa alta de errores de autenticacion.
2. Latencia p95 elevada de API.

## Seguridad continua automatizada

Workflow:
- `.github/workflows/security.yml`

Cobertura:
1. Dependency review en pull requests.
2. CodeQL (SAST) en PR, push a `main` y ejecucion programada.
3. Auditoria de dependencias de produccion (`pnpm audit --prod --audit-level high`).
4. Validacion periodica de baseline CSP y cabeceras en `apps/web/nginx.conf`.

## Checklist de verificacion de ciberseguridad

Ejecucion local recomendada antes de merge:

```bash
corepack pnpm security:audit
corepack pnpm security:csp:check
corepack pnpm -C apps/api test:contract
corepack pnpm quality:gate
```

Criterio de aceptacion:
1. Sin vulnerabilidades high/critical en dependencias de produccion.
2. Check CSP en verde.
3. Contratos de auth/permisos en verde.
4. Quality gate completa en verde.

## Riesgos residuales y mitigacion

1. Modo demo de autenticacion:
Riesgo: habilitar `ALLOW_DEMO_PASSWORD_AUTH=1` fuera de entorno controlado.
Mitigacion: mantener en `0` por defecto y habilitar solo en demo local.
2. Modo inseguro por cabeceras:
Riesgo: suplantacion si se habilita en entorno no seguro.
Mitigacion: `ALLOW_INSECURE_HEADER_AUTH=0` en despliegues normales.
3. Exposicion de Swagger:
Riesgo: superficie adicional de enumeracion.
Mitigacion: `ENABLE_SWAGGER=0` en produccion salvo necesidad operativa justificada.

## Revision periodica de CSP

Script:
- `scripts/security/check-csp.mjs`

Checklist de control:
1. Presencia de cabeceras de seguridad base.
2. Directivas CSP criticas (`default-src`, `script-src`, `connect-src`, `frame-ancestors`, `base-uri`, `form-action`).
3. Correccion de desviaciones antes de release.
