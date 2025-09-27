# 📚 TekaBiblio

Gestor de Biblioteca desarrollado como proyecto educativo. Permite administrar materiales, préstamos, reservas, salas de estudio, eventos y sanciones de usuarios en una red de bibliotecas.

---

## 📖 Índice
- [Descripción](#-descripción)
- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Pruebas](#-pruebas)
- [Demo](#-demo)
- [Autores](#-autores)
- [Licencia](#-licencia)

---

## 📝 Descripción
TekaBiblio es una aplicación web full-stack diseñada para gestionar la actividad diaria de una biblioteca:
- Catálogo de materiales y ejemplares físicos.
- Gestión de préstamos y devoluciones con control de retrasos.
- Reservas de materiales y salas.
- Registro de eventos y actividades.
- Control de multas y sanciones.
- Reportes básicos de uso y ocupación.

---

## ✨ Características
- Roles de usuario: socio, bibliotecario y administrador.
- Reservas de materiales con cola de espera.
- Renovaciones condicionadas según disponibilidad.
- Reservas de salas/puestos con control de aforo y horarios.
- Cálculo automático de multas por retrasos.
- Reportes de actividad (préstamos, ocupación, usuarios con sanciones).
- Semillas de datos realistas para demo.

---

## 🛠 Tecnologías
- **Frontend:** React + TypeScript + MUI
- **Backend:** Node.js + NestJS + TypeORM
- **Base de datos:** MySQL
- **Autenticación:** JWT + roles
- **Infraestructura:** (ej. Docker / Heroku / Vercel / Render)

---

## ⚙️ Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/MarcosYerga/TekaBiblio.git
   cd TekaBiblio
