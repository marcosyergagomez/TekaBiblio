# Operacion de Datos

Fecha de revision: 2026-04-14.

## Objetivo

Definir el proceso formal de migraciones, backup y restore para minimizar riesgo de perdida de datos y validar resiliencia de forma periodica.

## Politica de migraciones

1. Toda migracion SQL se registra en `apps/api/database/migrations` con nombre `YYYY-MM-DD-descripcion.sql`.
2. Ningun cambio de esquema se aplica manualmente en produccion sin archivo versionado.
3. Cada PR con cambios de schema debe incluir:
   - archivo de migracion
   - nota de compatibilidad/backfill si aplica
   - prueba de aplicacion en entorno de integracion
4. Las migraciones deben ser idempotentes cuando sea viable (comprobaciones de existencia) o tener plan de rollback documentado.

## Politica de backup

1. Frecuencia recomendada:
   - Diario: backup completo
   - Horario: backup incremental/logico si la plataforma lo permite
2. Conservacion minima:
   - diarios: 14 dias
   - semanales: 8 semanas
   - mensuales: 6 meses
3. Todo backup debe almacenarse cifrado y fuera del nodo primario.

## Politica de restore

1. Todo backup debe verificarse con restore real de forma periodica.
2. El restore drill debe validar al menos:
   - restauracion sin errores
   - presencia de tablas criticas (`users`, `materials`)
   - conteos basicos mayores que cero en dataset de prueba
3. Debe mantenerse evidencia del drill (workflow run + logs).

## Automatizacion implementada

Workflow de resiliencia:
- `.github/workflows/data-resilience.yml`

Que hace:
1. Levanta MySQL de prueba.
2. Aplica schema, seed y migraciones SQL versionadas.
3. Genera dump de backup.
4. Restaura en base limpia.
5. Ejecuta validaciones de integridad minima.

Periodicidad automatizada:
- semanal (martes 05:00 UTC) y ejecucion manual (`workflow_dispatch`).

## Procedimiento de emergencia (resumen)

1. Congelar escrituras de la app.
2. Identificar ultimo backup consistente.
3. Restaurar en entorno limpio y validar conteos/consistencia.
4. Reapuntar app al entorno restaurado.
5. Ejecutar smoke tests funcionales.
6. Documentar incidente y acciones preventivas.
