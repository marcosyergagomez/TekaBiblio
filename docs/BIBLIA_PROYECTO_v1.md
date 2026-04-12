# Biblia del Proyecto TekaBiblio v1

Fecha: 2026-04-09
Estado: Borrador validado por entrevista inicial

## 1. Vision
Construir una aplicacion fullstack para gestionar una red privada de bibliotecas con modelo de alquiler de pago, pensada para portfolio tecnico, demostrable en local con Docker y datos semilla.

## 2. Objetivo principal a 12 meses
Operar una red de 5 sedes donde usuarios cliente puedan alquilar materiales (libros, peliculas, juegos) y donde el staff administre catalogo, prestamos, reservas, envios entre sedes, penalizaciones y reportes de negocio.

## 3. Contexto y estrategia de producto
- Producto de portfolio, no orientado a produccion real.
- Prioridad en arquitectura limpia, reglas de negocio claras y experiencia de evaluacion para reclutadores.
- Ejecucion sencilla: levantar con Docker, correr seeds, usar cuentas demo y recorrer flujos clave.

## 4. Alcance funcional del MVP
### Incluido
- Gestion de una sola organizacion (single-tenant).
- Red minima de 5 sedes.
- Roles: admin global, admin sede, bibliotecario, socio, invitado.
- Catalogo de materiales y ejemplares por sede.
- Tipos de material:
  - Libro
  - Pelicula
  - Juego PC
  - Juego PlayStation
  - Juego Xbox
- Prestamos con precio y reglas por nivel de socio.
- Niveles de socio: bronce, plata, oro.
- Reservas con tiempo limite y posibles recargos.
- Prestamo entre sedes con gestion de envio.
- Penalizacion diaria por retraso.
- Bloqueo automatico por deuda/retraso.
- Reportes: ingresos, perdidas por robo/no devolucion, mas prestados, menos prestados.
- Calendario: horario comercial, festivos y fines de semana.
- Simulacion de notificaciones de email y WhatsApp (sin integracion real).

### Fuera de alcance MVP
- Multi-tenant real.
- Integraciones externas (SSO, ERP, pasarela de pago, firma digital).
- Requisitos legales/compliance avanzados.
- Canales de mensajeria reales.

## 5. Roles y permisos
### Admin global
- Gestion completa de todas las sedes.
- Configuracion global de reglas, precios y catalogos.
- Acceso total a reportes globales.

### Admin sede
- Gestion de su sede (inventario local, operaciones locales, staff local).
- No puede modificar configuracion global ni datos de otras sedes.

### Bibliotecario
- Operacion diaria: prestamos, devoluciones, reservas, cobros, incidencias.
- Gestion basica de ejemplares de su sede.

### Socio
- Consulta catalogo.
- Solicita prestamos y reservas segun nivel.
- Ve estado de cuenta, deudas y penalizaciones.

### Invitado
- Consulta catalogo publico limitado.
- Sin capacidad de reservar o alquilar.

## 6. Modelo funcional base
### Entidades principales
- Sede
- Usuario
- Rol
- SocioNivel
- Material
- Ejemplar
- Prestamo
- Reserva
- EnvioInterSede
- Penalizacion
- Pago
- Reporte

### Datos obligatorios minimos
- Material: nombre, fecha, tipo, sede.
- Ejemplar: nombre, fecha, tipo, sede.

Nota: Para robustez tecnica del portfolio, se recomienda ampliar pronto con codigo unico, estado, precio base y trazabilidad.

## 7. Reglas de negocio (version inicial)
### Prestamos
- Todo prestamo tiene precio.
- Reglas y precios dependen de nivel de socio (bronce/plata/oro).
- Puede permitirse prestamo desde otra sede, sujeto a reglas de disponibilidad y envio.

### Reservas
- Tienen un tiempo limite para ser retiradas.
- Si vence la ventana, puede aplicar recargo y liberacion de reserva.

### Penalizaciones
- Penalizacion diaria por retraso en devolucion.
- Se acumula por dia natural vencido.

### Bloqueos
- El socio puede quedar bloqueado automaticamente por deuda activa o retraso.
- Un socio bloqueado no puede generar nuevos prestamos.

### Envios entre sedes
- Cuando un socio solicita material de otra sede, se crea un flujo de envio con estados.
- Estados sugeridos: solicitado, en preparacion, en transito, recibido, entregado, cancelado.

## 8. Reportes MVP
- Ingresos por periodo, sede y tipo de material.
- Perdidas por robo o no devolucion.
- Ranking de materiales mas prestados.
- Ranking de materiales menos prestados.

## 9. Requisitos no funcionales para portfolio
- Arranque en un comando con Docker Compose.
- Seeds realistas para demo.
- Cuentas demo por rol.
- Documentacion clara de setup y recorrido funcional.
- API documentada y navegable.
- Pruebas basicas de negocio en backend.

## 10. Roadmap sugerido
### Fase 1 - Fundacion tecnica
- Cerrar bootstrap API y frontend minimo.
- Modelo de datos inicial y migraciones.
- Seeds de 5 sedes, usuarios demo, catalogo demo.

### Fase 2 - Operacion core
- Catalogo, ejemplares, prestamos y devoluciones.
- Niveles de socio y reglas de precio.
- Bloqueo automatico por deuda/retraso.

### Fase 3 - Red de sedes
- Reservas.
- Flujo de envio entre sedes.
- Reglas de SLA interno de traslado.

### Fase 4 - Capa directiva
- Reportes de negocio.
- Dashboard basico web.
- Pulido final para presentacion a empleadores.

## 11. KPIs de exito
- Tiempo de puesta en marcha local menor a 15 minutos.
- Cobertura de pruebas de reglas criticas mayor o igual a 60 por ciento en modulo de prestamos/reservas.
- Flujo demo completo (alta socio a devolucion) en menos de 5 minutos.
- Cero errores bloqueantes en recorrido demo documentado.

## 12. Criterios de aceptacion del MVP
- Se pueden operar 5 sedes en una sola organizacion.
- Existen roles y permisos diferenciados funcionales.
- Se pueden alquilar libros, peliculas y juegos por nivel de socio.
- Hay reservas con expiracion y penalizacion diaria por demora.
- Funciona el flujo de solicitud entre sedes con estados de envio.
- Se bloquea automaticamente a socios con deuda/retraso.
- Se generan reportes de ingresos, perdidas y popularidad de materiales.
- La app levanta en Docker con seeds y walkthrough reproducible.

## 13. Preguntas de cierre (Ronda 2)
Para cerrar la Biblia v2 faltan solo valores numericos de negocio:
1. Plazo de prestamo por tipo de material y nivel (dias).
2. Precio base por tipo de material y descuentos por nivel.
3. Limite de prestamos simultaneos por nivel.
4. Numero maximo de renovaciones por nivel.
5. Ventana de recogida de reserva (horas o dias).
6. Formula exacta de recargo por reserva vencida.
7. Penalizacion diaria exacta y tope maximo por prestamo.
8. Regla exacta de bloqueo (umbral de deuda y dias de retraso).
9. Coste de envio entre sedes y quien lo paga.
10. SLA esperado de traslado entre sedes (dias).

## 14. Demo script recomendado para empleadores
- Login con admin global, vista de 5 sedes y reglas globales.
- Login con admin sede y operacion restringida a su sede.
- Login socio oro: reserva de material en otra sede.
- Simulacion de envio y entrega.
- Simulacion de retraso y penalizacion.
- Visualizacion de reportes de ingresos y top de materiales.
