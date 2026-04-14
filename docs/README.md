# Documentacion de TekaBiblio

Este indice define que documentos son canonicos, cuales estan deprecados y como se mantienen.

Fecha de ultima revision global: 2026-04-14.

## Inventario y estado

| Documento | Proposito | Estado | Canonico | Responsable | Ultima revision |
| --- | --- | --- | --- | --- | --- |
| `apps/web/README.md` | Guia operativa y tecnica del frontend | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/OPERACION_DATOS.md` | Politica formal de migraciones, backup y restore | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/OBSERVABILIDAD_SEGURIDAD_CONTINUA.md` | Baseline de logs, metricas, alertas y seguridad continua | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/BIBLIA_PROYECTO_v2.md` | Vision funcional y alcance de producto | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/BIBLIA_PROYECTO_v1.md` | Version historica del alcance | Deprecado | No | Equipo TekaBiblio | 2026-04-14 |
| `docs/BACKLOG_TECNICO_SPRINTS.md` | Plan tecnico por sprints | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/MATRIZ_PERMISOS_MVP.md` | Matriz de permisos por rol | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/REGLAS_NEGOCIO_API_FRONTEND.md` | Contrato funcional entre API y frontend | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/GUIA_DEMO_FINAL.md` | Script de demo funcional | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/DEPLOY_RELEASE.md` | Proceso de release y despliegue | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/DB_SCHEMA_INICIAL.md` | Referencia del esquema inicial SQL | Activo | Si | Equipo TekaBiblio | 2026-04-14 |
| `docs/seed/seed-demo-mvp.json` | Dataset base para demo MVP | Activo | Si | Equipo TekaBiblio | 2026-04-14 |

## Reglas de mantenimiento

1. Todo PR que cambie comportamiento funcional, seguridad o API debe incluir actualizacion de documentacion en el mismo PR.
2. `README.md` (raiz) y `apps/api/README.md` son fuentes de verdad operativa para arranque y hardening.
3. Si existe solapamiento entre documentos, prevalece el documento marcado como canonico en esta tabla.
4. Un documento reemplazado debe marcarse como deprecado y enlazar a su reemplazo.
5. Revisar este indice en cada release o al menos una vez por sprint.

## Convencion minima de calidad documental

- Mantener pasos ejecutables (comandos probados).
- Evitar tecnologia "planeada" presentada como "implementada".
- Incluir fecha de revision en documentos de operacion.
- Explicar defaults de seguridad y flags peligrosas de forma explicita.
