# Biblia del Proyecto TekaBiblio v2

Fecha: 2026-04-09
Estado: Cerrada para implementacion MVP (portfolio)

## 1. Vision
Construir una aplicacion fullstack para gestionar una red privada de bibliotecas con modelo de alquiler de pago, demostrable en local con Docker y datos semilla orientados a una demo tecnica para reclutadores.

## 2. Objetivo principal a 12 meses
Operar una red de 5 sedes donde clientes alquilan libros, peliculas y juegos, mientras el staff administra catalogo, prestamos, reservas, envios entre sedes, penalizaciones y reportes de negocio.

## 3. Alcance del MVP
- Single-tenant (una sola organizacion).
- 5 sedes activas.
- Roles: admin_global, admin_sede, bibliotecario, socio, invitado.
- Niveles de socio: bronce, plata, oro.
- Tipos de material: LIBRO, PELICULA, JUEGO_PC, JUEGO_PLAYSTATION, JUEGO_XBOX.
- Prestamos de pago por tipo y nivel.
- Reservas con expiracion.
- Envio inter-sede con trazabilidad de estados.
- Penalizacion diaria y bloqueo automatico.
- Reportes de ingresos, perdidas por no devolucion/robo, top y bottom de prestamos.

## 4. Politica comercial cerrada (numerica)

### 4.1 Plazo de prestamo por tipo y nivel (dias)
| Tipo | Bronce | Plata | Oro |
|---|---:|---:|---:|
| LIBRO | 14 | 21 | 30 |
| PELICULA | 3 | 5 | 7 |
| JUEGO_PC | 5 | 7 | 10 |
| JUEGO_PLAYSTATION | 5 | 7 | 10 |
| JUEGO_XBOX | 5 | 7 | 10 |

### 4.2 Precio base por tipo (EUR por prestamo)
| Tipo | Precio base |
|---|---:|
| LIBRO | 2.50 |
| PELICULA | 3.50 |
| JUEGO_PC | 4.00 |
| JUEGO_PLAYSTATION | 5.00 |
| JUEGO_XBOX | 5.00 |

### 4.3 Ajuste por nivel de socio
| Nivel | Ajuste sobre precio base |
|---|---:|
| BRONCE | 0% |
| PLATA | -10% |
| ORO | -20% |

Formula de precio final:
precio_final = precio_base * (1 + ajuste_nivel)

### 4.4 Limite de prestamos simultaneos
| Nivel | Max prestamos activos |
|---|---:|
| BRONCE | 2 |
| PLATA | 4 |
| ORO | 6 |

### 4.5 Maximo de renovaciones
| Nivel | Max renovaciones por prestamo |
|---|---:|
| BRONCE | 1 |
| PLATA | 2 |
| ORO | 3 |

Regla de renovacion: solo si no existe reserva activa de otro socio para ese ejemplar y no hay deuda vencida del socio.

### 4.6 Ventana de recogida de reserva
- Ventana maxima: 48 horas desde que el ejemplar queda listo para retiro.
- Si expira: reserva pasa a EXPIRED y se libera el ejemplar.

### 4.7 Recargo por reserva vencida
- Recargo fijo: 1.00 EUR por reserva vencida.
- Si el socio acumula 3 reservas vencidas en 30 dias, bloquea nuevas reservas por 7 dias.

### 4.8 Penalizacion diaria por retraso y tope
| Tipo | Penalizacion diaria (EUR) | Tope por prestamo (EUR) |
|---|---:|---:|
| LIBRO | 0.50 | 15.00 |
| PELICULA | 1.00 | 12.00 |
| JUEGO_PC | 1.50 | 20.00 |
| JUEGO_PLAYSTATION | 1.50 | 20.00 |
| JUEGO_XBOX | 1.50 | 20.00 |

Formula:
penalizacion = min(dias_retraso * tarifa_diaria_tipo, tope_tipo)

### 4.9 Regla de bloqueo automatico
Un socio queda bloqueado si cumple cualquier condicion:
- deuda_total >= 20.00 EUR
- existe al menos 1 prestamo con retraso > 10 dias
- tiene 3 o mas prestamos vencidos en los ultimos 60 dias

Desbloqueo automatico cuando:
- deuda_total < 5.00 EUR
- no hay prestamos activos vencidos

### 4.10 Envio entre sedes
- Modelo: coste fijo.
- Coste base envio inter-sede: 2.99 EUR por solicitud.
- Quiere pagar: cliente.
- Beneficio por nivel:
  - BRONCE: paga 100% (2.99 EUR)
  - PLATA: paga 50% (1.50 EUR)
  - ORO: gratis (0.00 EUR)

### 4.11 SLA de traslado entre sedes
- SLA objetivo: 48 horas.
- SLA maximo comprometido: 3 dias habiles.

Estados de envio:
REQUESTED -> PREPARING -> IN_TRANSIT -> ARRIVED -> READY_FOR_PICKUP -> DELIVERED
Estados de excepcion:
CANCELLED, LOST

## 5. Politicas de calendario
- Horario comercial por sede (configurable).
- Fines de semana sin salidas de envio (solo recepcion opcional).
- Festivos por sede sin computo de SLA operativo.

## 6. Reportes obligatorios del MVP
- Ingresos por periodo/sede/tipo.
- Perdidas por no devolucion o robo.
- Top materiales mas prestados.
- Bottom materiales menos prestados.

## 7. Criterios de aceptacion funcional
- Se operan 5 sedes con permisos por rol y alcance.
- Prestamos aplican precio y plazo correctos por tipo y nivel.
- Reserva expira en 48h y aplica recargo definido.
- Retrasos calculan penalizacion con tope.
- Bloqueo se ejecuta automaticamente por reglas de deuda/retraso.
- Envio inter-sede con estados y SLA trazable.
- Reportes clave disponibles con datos seed.

## 8. Entregables de implementacion vinculados
- Matriz de permisos: docs/MATRIZ_PERMISOS_MVP.md
- Reglas API/frontend: docs/REGLAS_NEGOCIO_API_FRONTEND.md
- Seed demo portfolio: docs/seed/seed-demo-mvp.json
