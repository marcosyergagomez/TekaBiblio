# Reglas de Negocio para API y Frontend

Fecha: 2026-04-09
Estado: Directo para implementacion

## Tabla de reglas
| Rule ID | Regla | Backend (API) | Frontend (UI/UX) | Error code sugerido |
|---|---|---|---|---|
| RB-001 | Prestamo solo a socio activo | Validar member.status=ACTIVE antes de crear prestamo | Deshabilitar boton alquilar si bloqueado | MEMBER_BLOCKED |
| RB-002 | Limite de prestamos por nivel | Contar prestamos activos y comparar con limite nivel | Mostrar contador Activos/Max y aviso preventivo | LOAN_LIMIT_REACHED |
| RB-003 | Precio final por nivel | Aplicar formula precio_final sobre tipo y nivel | Mostrar desglose precio base, ajuste y total | PRICE_RULE_APPLIED |
| RB-004 | Plazo por tipo y nivel | due_date = now + plazo configurado | Mostrar fecha limite antes de confirmar | LOAN_TERM_APPLIED |
| RB-005 | Renovacion condicionada | Denegar si hay reserva de tercero o deuda vencida | Boton renovar oculto o deshabilitado con motivo | RENEWAL_NOT_ALLOWED |
| RB-006 | Max renovaciones por nivel | renewal_count < limite_nivel | Mostrar renovaciones usadas/restantes | RENEWAL_LIMIT_REACHED |
| RB-007 | Reserva con expiracion 48h | expires_at = ready_for_pickup_at + 48h | Timer visible en reserva | RESERVATION_EXPIRED |
| RB-008 | Recargo reserva vencida | Al expirar, crear cargo fijo 1.00 EUR | Mostrar cargo en estado de cuenta | RESERVATION_EXPIRE_FEE |
| RB-009 | Bloqueo por deuda | Bloquear si deuda_total >= 20.00 EUR | Banner de cuenta bloqueada | MEMBER_BLOCKED_DEBT |
| RB-010 | Bloqueo por retraso grave | Bloquear si existe retraso > 10 dias | Banner de cuenta bloqueada por atraso | MEMBER_BLOCKED_OVERDUE |
| RB-011 | Bloqueo por reincidencia | Bloquear si >=3 vencidos en 60 dias | Mostrar fecha estimada de desbloqueo | MEMBER_BLOCKED_RECIDIVISM |
| RB-012 | Penalizacion diaria por tipo | penalty=min(dias*tarifa_tipo,tope_tipo) | Simulador de penalizacion en ficha de prestamo | LATE_FEE_APPLIED |
| RB-013 | Solicitud inter-sede | Si copy no local, crear shipment + coste | Mostrar estado logistico en linea de tiempo | SHIPMENT_CREATED |
| RB-014 | Coste envio por nivel | BRONCE 2.99, PLATA 1.50, ORO 0.00 | Mostrar coste envio antes de confirmar | SHIPMENT_FEE_APPLIED |
| RB-015 | SLA de traslado | Registrar breach si supera 3 dias habiles | Etiqueta En riesgo/SLA excedido | SHIPMENT_SLA_BREACH |
| RB-016 | Devolucion cierra prestamo | Al devolver, cerrar loan y frenar acumulacion multa | Confirmacion con ticket de cierre | LOAN_CLOSED |
| RB-017 | Perdida/robo de ejemplar | Permitir estado LOST y generar perdida contable | Flujo de incidencia en devolucion | COPY_MARKED_LOST |
| RB-018 | Lectura por alcance de rol | Aplicar filtros por branch_id/member_id | Vistas segmentadas por rol y alcance | FORBIDDEN_SCOPE |
| RB-019 | Invitado solo catalogo publico | Rechazar endpoints privados a invitado | CTA para login en acciones restringidas | AUTH_REQUIRED |
| RB-020 | Reportes por rol | Global solo admin_global, sede para staff local | Selector de alcance segun rol | FORBIDDEN_REPORT_SCOPE |

## Contrato de configuracion sugerido

```json
{
  "loanPolicies": {
    "LIBRO": { "BRONCE": 14, "PLATA": 21, "ORO": 30 },
    "PELICULA": { "BRONCE": 3, "PLATA": 5, "ORO": 7 },
    "JUEGO_PC": { "BRONCE": 5, "PLATA": 7, "ORO": 10 },
    "JUEGO_PLAYSTATION": { "BRONCE": 5, "PLATA": 7, "ORO": 10 },
    "JUEGO_XBOX": { "BRONCE": 5, "PLATA": 7, "ORO": 10 }
  },
  "basePrices": {
    "LIBRO": 2.50,
    "PELICULA": 3.50,
    "JUEGO_PC": 4.00,
    "JUEGO_PLAYSTATION": 5.00,
    "JUEGO_XBOX": 5.00
  },
  "levelAdjustments": {
    "BRONCE": 0.00,
    "PLATA": -0.10,
    "ORO": -0.20
  }
}
```

## Orden recomendado de validacion en API
1. Autenticacion y rol.
2. Alcance de sede/cuenta.
3. Estado de socio y bloqueos.
4. Disponibilidad del ejemplar.
5. Reglas de limites y renovaciones.
6. Calculo economico (precio/envio/penalizacion).
7. Persistencia y evento de auditoria.
