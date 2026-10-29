# Runbook de EduMatch

## Propósito y alcance

Este runbook describe cómo iniciar y comprobar EduMatch en desarrollo, aplicar
migraciones y diagnosticar los fallos locales más comunes. No define un
procedimiento de despliegue, respaldo o recuperación de producción: esos
procedimientos deben establecerse y probarse en la infraestructura que aloje el
sistema antes de operar con datos reales.

La aplicación local consta de una interfaz Vite en el puerto `5173`, una API
Express en el puerto `8000` y MySQL en el puerto `3306` del servicio `db`.
El frontend reenvía las solicitudes `/api` al backend. Los archivos estáticos
antiguos de `Alumnos/html/` y `js/` no son la interfaz React activa.

## Reglas de seguridad y cambios de datos

- No ejecutes `npm --prefix backend run db:seed` ni `db:setup` en producción:
  cargan cuentas y registros exclusivamente de demostración. El seed se
  bloqueará si `NODE_ENV=production`, pero esa protección no reemplaza una
  operación segura.
- Antes de aplicar migraciones a una base de datos con datos que deban
  conservarse, confirma que existe un respaldo reciente y que el procedimiento
  de restauración está probado. El repositorio no configura respaldos ni
  migraciones de reversión automáticas.
- No borres volúmenes ni tablas para solucionar un fallo. Investiga el mensaje,
  conserva los datos y coordina cambios correctivos con quien administra la
  base de datos.
- Las cuentas y contraseñas de demostración de desarrollo están documentadas
  en [README.md](../README.md). No las reutilices en producción; los números de
  estudiante de demostración no verifican matrícula.
- No guardes secretos en el repositorio, en el frontend ni en logs. La
  aplicación no incluye registro público de administradores: provisiona la
  cuenta inicial mediante un procedimiento controlado fuera de la aplicación.
- Para cualquier entorno de producción se requiere HTTPS. Configura el origen
  real del frontend y los secretos en el gestor de configuración de la
  plataforma; nunca copies credenciales de desarrollo.

## Inicio local

### 1. Preparar el entorno

Abre el repositorio en el Dev Container para que el backend pueda resolver
MySQL como `db`. El contenedor de desarrollo instala dependencias del frontend
y espera a que MySQL esté disponible. El entorno esperado usa Node.js 22.x.
Comprueba el entorno:

```bash
node --version
npm --version
mysql -h db -u dev -pdev appdb -e "SELECT 1;"
```

La consulta de MySQL debe devolver `1`. Fuera del Dev Container, configura
`backend/.env` localmente con los valores de conexión `DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD` y `DB_NAME` correspondientes a una instancia MySQL
accesible. No compartas el archivo ni lo agregues al control de versiones.

La aplicación usa por omisión `http://localhost:5173` como origen del
frontend. Si el frontend local utiliza otro origen, establece
`FRONTEND_ORIGIN` en la configuración del backend. El inicio de sesión
institucional de Microsoft Entra es opcional; para habilitarlo configura
`MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` y
`MICROSOFT_REDIRECT_URI` en el backend y registra la URI de retorno en la
aplicación de Entra. Conserva el secreto solo en configuración privada.

### 2. Preparar la base de datos

Para una base existente o una actualización normal, aplica solo las migraciones
pendientes:

```bash
npm --prefix backend run db:migrate
```

Para una base local nueva que también necesite las cuentas y datos de ejemplo,
usa en su lugar:

```bash
npm --prefix backend run db:setup
```

`db:setup` ejecuta migraciones y luego carga datos de demostración. No lo uses
en producción. Las migraciones no tienen reversión automática. Si una
migración se detiene porque hay registros antiguos que incumplen las reglas de
validación, conserva el error, revisa los registros con la persona responsable
de los datos y corrige únicamente con información verificada; no inventes
números de matrícula ni catálogos oficiales.

### 3. Iniciar API e interfaz

Ejecuta cada comando en una terminal diferente:

```bash
npm --prefix backend run dev
```

```bash
npm --prefix frontend run dev -- --host 0.0.0.0
```

Abre `http://localhost:5173`. El backend comprueba conectividad y estructura
MySQL antes de escuchar en el puerto `8000`. Para cambiar el puerto del
backend, define `PORT` en su entorno; el proxy de Vite apunta por defecto a
`http://localhost:8000`, por lo que un cambio de puerto también requiere
actualizar esa configuración.

## Verificación de servicio

Comprueba que la API y su conexión con la base estén disponibles:

```bash
curl --fail http://localhost:8000/api/health
```

La respuesta esperada es JSON con `Backend funcionando` y `database: mysql`.
También puedes comprobar la ruta `/api` a través del proxy del frontend:

```bash
curl --fail http://localhost:5173/api/health
```

Comprueba la interfaz en el navegador y, si procede, inicia sesión con una
cuenta de desarrollo cargada por el seed. Los registros nuevos de estudiantes
y tutores quedan pendientes de aprobación; un registro pendiente no equivale a
una cuenta aprobada. Las rutas de aprobación requieren una sesión de
administrador.

## Verificación de CI

El workflow de GitHub Actions ejecuta análisis de secretos, auditoría de
dependencias, pruebas backend con cobertura mínima, migraciones MySQL, una
comprobación HTTP de la API y el build frontend. El detalle de cada barrera,
los comandos locales y la configuración de protecciones de rama está en
[ci.md](./ci.md).

En un Dev Container con MySQL accesible, ejecuta las comprobaciones locales
disponibles con:

```bash
bash scripts/ci-local.sh
```

La versión local no descarga herramientas ni requiere acceso a internet. Por
eso, el escaneo Gitleaks y `npm audit` se verifican en el workflow alojado de
GitHub; el resto de las verificaciones locales termina con error si una prueba,
migración, compilación o comprobación de API falla.

## Diagnóstico y recuperación

### El backend no inicia o `/api/health` falla

1. Verifica que MySQL responde con el comando `mysql` de la sección de inicio.
2. Revisa que `backend/.env` tenga las cinco variables de base de datos
   requeridas y que coincidan con el servidor activo.
3. Si el mensaje indica esquema incompleto, ejecuta
   `npm --prefix backend run db:migrate` y vuelve a iniciar el backend.
4. Si no conecta, corrige primero el servicio o la configuración de MySQL.
   No sustituyas MySQL por almacenamiento en memoria: el backend no guarda
   cambios cuando la base de datos no está disponible.

### El navegador no puede acceder a la API

1. Confirma que el backend responde directamente en
   `http://localhost:8000/api/health`.
2. Confirma que Vite está en `http://localhost:5173` y vuelve a probar
   `http://localhost:5173/api/health`.
3. Si el frontend está en otro origen, comprueba `FRONTEND_ORIGIN` y reinicia
   el backend. Si cambiaste el puerto de la API, actualiza el proxy en
   `frontend/vite.config.mjs`.

### Una migración falla por datos antiguos

No marques la migración como aplicada ni elimines registros para evitar el
error. Guarda el mensaje, determina qué filas incumplen las reglas y coordina
una corrección verificada con quien administra los datos. Tras resolverlas,
vuelve a ejecutar `npm --prefix backend run db:migrate`.

### Inicio de sesión institucional no disponible

Comprueba que las cuatro variables `MICROSOFT_*` están configuradas en el
backend y que `MICROSOFT_REDIRECT_URI` coincide exactamente con la URI Web
registrada en Microsoft Entra. El acceso institucional es para estudiantes y
tutores con cuenta `@ues.mx`. Un estudiante nuevo puede validar su correo con
Microsoft y completar el formulario de perfil; su cuenta queda pendiente de
aprobación administrativa. Un tutor también puede iniciar una solicitud y
requiere aprobación. La contraseña institucional se escribe solo en Microsoft,
nunca en EduMatch.

### No hay materias disponibles para el registro de tutores

Comprueba que el catálogo oficial esté activo en `careers` y que las materias
estén vinculadas a los semestres correctos en `career_subjects`. No cargues
relaciones estimadas ni de demostración: el registro y la búsqueda excluyen las
materias hasta que el plan oficial esté disponible.

### Incidente con credenciales o datos

Limita el acceso al entorno, conserva los logs y la base de datos para
investigación, y avisa a la persona responsable del sistema. Rota los secretos
afectados mediante el gestor de configuración de la plataforma y reinicia los
servicios según su procedimiento. No publiques secretos ni datos personales
en tickets, capturas o logs compartidos. La estrategia de respuesta, respaldo
y restauración de producción debe definirse con el equipo que opera esa
infraestructura.

## Referencias operativas

- [README.md](../README.md): instalación, cuentas de desarrollo y flujos de la
  API.
- [architecture.md](./architecture.md): componentes, límites de autorización
  y modelo de integración.
- [week1-verification.md](./week1-verification.md): comprobación del entorno
  local y controles del repositorio.
- [ci.md](./ci.md): barreras del workflow, umbrales y verificación de CI.
- [cloudflare.md](./cloudflare.md): túnel temporal para pruebas; no es un
  procedimiento de despliegue de producción.
