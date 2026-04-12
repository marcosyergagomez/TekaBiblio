# Backlog Tecnico por Sprints

Fecha: 2026-04-10
Horizonte: 6 sprints de 2 semanas
Objetivo: llegar a MVP demostrable en portfolio con Docker + seed + recorrido funcional

## Sprint 0 - Fundacion y consistencia tecnica
### API
- Estandarizar estructura modular por dominio.
- Activar ValidationPipe global y manejo de errores uniforme.
- Definir contratos base de DTO y convencion de codigos de error.

### Web
- Inicializar app Vite con React y TypeScript.
- Definir layout base, routing y sistema de autenticacion mock.
- Configurar cliente API y manejo de estados de carga/error.

### Plataforma
- Revisar docker-compose para desarrollo local estable.
- Definir variables de entorno y plantillas .env.example.
- Pipeline local: lint + typecheck + test.

### DoD sprint
- Proyecto arranca con docker compose up y muestra API + web funcional minima.

## Sprint 1 - Modelo de datos y autenticacion
### API
- Implementar esquema inicial basado en apps/api/database/schema-v1.sql.
- Crear migraciones iniciales y seed base de 5 sedes + usuarios demo.
- Modulo auth basico con JWT y roles.

### Web
- Pantalla login y selector de usuario demo.
- Guard de rutas por rol.
- Pantalla de perfil con rol y sede activa.

### DoD sprint
- Login funcional con roles y datos seed cargados.

## Sprint 2 - Catalogo y ejemplares
### API
- Modulo materials y copies con CRUD y alcance por sede.
- Estados de ejemplar: AVAILABLE, ON_LOAN, IN_TRANSFER, LOST, DAMAGED.
- Filtros por tipo, sede y disponibilidad.

### Web
- Vista catalogo con busqueda y filtros.
- Vista detalle de material y ejemplares por sede.
- Pantallas de alta/edicion para staff.

### DoD sprint
- Staff puede gestionar catalogo y ejemplares con permisos correctos.

## Sprint 3 - Prestamos core
### API
- Persistir modulo loans ya iniciado (create, renew, return, late-fee).
- Aplicar reglas por nivel, limites, renovaciones y bloqueo automatico.
- Registrar pagos simulados y auditoria de operaciones.

### Web
- Flujo de checkout de prestamo.
- Vista de prestamos activos e historico por socio.
- Devolucion con calculo de penalizacion visible.

### DoD sprint
- Flujo completo prestar-renovar-devolver con reglas validadas por tests.

## Sprint 4 - Reservas y envios inter-sede
### API
- Cola de reservas por material.
- Expiracion a 48h y recargo por reserva vencida.
- Modulo shipments con estados y SLA de traslado.

### Web
- Reserva de material desde catalogo.
- Timeline de envio inter-sede.
- Alertas de vencimiento de reserva.

### DoD sprint
- Socio puede reservar material remoto y seguir envio hasta recogida.

## Sprint 5 - Reportes y cierre portfolio
### API
- Reportes: ingresos, perdidas, top y bottom de materiales.
- Endpoint de dashboard para admin global y sede.
- Endurecer tests e2e de recorridos clave.

### Web
- Dashboard ejecutivo con KPIs.
- Pulido UX para demo a reclutadores.
- Guia de demo con pasos reproducibles.

### Plataforma
- CI con lint/typecheck/test/build.
- README final con quickstart y credenciales demo.

### DoD sprint
- Proyecto publicable: docker + seed + walkthrough completo para evaluacion tecnica.

## Orden de implementacion recomendado
1. Persistencia y auth base.
2. Catalogo y ejemplares.
3. Prestamos y pagos.
4. Reservas y envios.
5. Reportes y pulido final.

## Riesgos tecnicos y mitigaciones
- Riesgo: deriva entre reglas de negocio y codigo.
- Mitigacion: centralizar reglas en modulo policy + tests por regla.

- Riesgo: permisos cruzados por sede.
- Mitigacion: guardas de alcance con tests de autorizacion.

- Riesgo: demo frágil para reclutadores.
- Mitigacion: seed determinista y script de demo automatizado.
