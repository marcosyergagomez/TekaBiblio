# Matriz de Permisos MVP

Fecha: 2026-04-09
Estado: Lista para implementar

Convenciones:
- YES: permitido
- NO: denegado
- OWN_BRANCH: solo sede asignada
- OWN_ACCOUNT: solo su propia cuenta

| Permission code | admin_global | admin_sede | bibliotecario | socio | invitado | Scope/nota |
|---|---|---|---|---|---|---|
| branch.read | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Lectura de datos de sede |
| branch.update | YES | OWN_BRANCH | NO | NO | NO | Config de sede |
| staff.manage | YES | OWN_BRANCH | NO | NO | NO | Alta/baja staff sede |
| member.read | YES | OWN_BRANCH | OWN_BRANCH | OWN_ACCOUNT | NO | Ficha de socios |
| member.update | YES | OWN_BRANCH | OWN_BRANCH | OWN_ACCOUNT | NO | Datos perfil |
| member.block | YES | OWN_BRANCH | NO | NO | NO | Bloqueo manual |
| membership.level.change | YES | OWN_BRANCH | NO | NO | NO | Bronce/Plata/Oro |
| catalog.read.public | YES | YES | YES | YES | YES | Catalogo visible |
| material.create | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Alta de material |
| material.update | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Edicion de material |
| material.delete | YES | OWN_BRANCH | NO | NO | NO | Borrado logico recomendado |
| copy.create | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Alta de ejemplar |
| copy.update | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Estado/ubicacion |
| loan.create.local | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Prestamo local en mostrador |
| loan.create.cross_branch | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Inicia envio inter-sede |
| loan.renew | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Sujetas a reglas |
| loan.return | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Devolucion y cierre |
| reservation.create | YES | OWN_BRANCH | OWN_BRANCH | YES | NO | Socio desde portal |
| reservation.cancel | YES | OWN_BRANCH | OWN_BRANCH | YES | NO | Socio solo propias |
| reservation.force_expire | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Operacion staff |
| shipment.read | YES | OWN_BRANCH | OWN_BRANCH | OWN_ACCOUNT | NO | Socio ve los suyos |
| shipment.update_status | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Flujo logistico |
| penalty.read | YES | OWN_BRANCH | OWN_BRANCH | OWN_ACCOUNT | NO | Consulta multas |
| penalty.waive | YES | OWN_BRANCH | NO | NO | NO | Condonacion |
| payment.register | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Cobro en caja |
| report.read.global | YES | NO | NO | NO | NO | Reportes globales |
| report.read.branch | YES | OWN_BRANCH | OWN_BRANCH | NO | NO | Reportes por sede |
| audit.read | YES | OWN_BRANCH | NO | NO | NO | Log de acciones |

## Reglas de alcance para backend
- Si rol=admin_sede o bibliotecario, cualquier recurso con branch_id debe coincidir con su branch_id.
- Socio solo accede a recursos donde member_id coincide con su user_id.
- Invitado nunca accede a endpoints privados.

## Reglas de alcance para frontend
- Ocultar acciones no permitidas por rol.
- Filtrar vistas por sede para admin_sede y bibliotecario.
- Mostrar bloqueos de socio en dashboard y checkout.
