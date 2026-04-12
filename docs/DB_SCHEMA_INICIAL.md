# Esquema Inicial de Base de Datos

Fecha: 2026-04-10
Fuente SQL: apps/api/database/schema-v1.sql
Motor objetivo: MySQL 8

## Entidades principales
- organizations
- branches
- users
- members
- materials
- copies
- loans
- reservations
- shipments
- penalties
- payments
- audit_logs

## Relaciones clave
- organizations 1:N branches
- branches 1:N users
- users 1:0..1 members
- branches 1:N members (home_branch)
- branches 1:N materials (home_branch)
- materials 1:N copies
- members 1:N loans
- copies 1:N loans
- materials 1:N reservations
- members 1:N reservations
- reservations 1:N shipments (opcional)
- loans 1:N shipments (opcional)
- members 1:N penalties
- loans 1:N penalties (opcional)
- reservations 1:N penalties (opcional)
- members 1:N payments
- loans 1:N payments (opcional)
- penalties 1:N payments (opcional)

## Campos de negocio relevantes
- members.membership_level: BRONCE, PLATA, ORO
- members.debt_total: deuda agregada para bloqueo automatico
- copies.status: disponibilidad y estados logistico/operativos
- loans.renewal_count: control de renovaciones
- loans.due_at y loans.late_fee_amount: base de penalizacion
- reservations.expires_at y reservations.expire_fee: control de caducidad
- shipments.sla_target_at y shipments.sla_deadline_at: seguimiento de SLA

## Indices sugeridos ya incluidos
- idx_loans_status_due_at
- idx_reservations_status_expires
- idx_shipments_status_sla
- idx_penalties_status
- idx_payments_paid_at

## Notas de implementacion
- El esquema ya esta preparado para single-tenant con organizations (futuro multi-tenant).
- Las restricciones de alcance por sede deben reforzarse en capa de aplicacion.
- Se recomienda soft delete en tablas operativas en siguientes iteraciones.
