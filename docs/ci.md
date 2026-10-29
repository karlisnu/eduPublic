# CI de EduMatch

## Controles automáticos

El workflow [ci.yml](../.github/workflows/ci.yml) se ejecuta en cada pull
request y en los pushes a `main` y `karla-branch`. Sus jobs son independientes
para que el resultado de cada barrera sea visible por separado:

| Job | Qué bloquea |
| --- | --- |
| **Secret scan** | Ejecuta Gitleaks con el historial completo del repositorio. Un secreto detectado hace fallar el job. Un secreto expuesto debe revocarse y rotarse; no se debe ocultar la alerta ni copiar el valor a un reporte. |
| **Dependency audit** | Ejecuta `npm audit --audit-level=high` para los manifiestos y lockfiles de raíz, backend y frontend. Vulnerabilidades altas o críticas bloquean CI. |
| **Repository configuration** | Verifica Node.js 22, la sintaxis del setup de desarrollo, el JSON del Dev Container y los archivos de proyecto requeridos. |
| **Backend tests and MySQL integration** | Detecta pruebas omitidas o fallos de CI silenciados, aplica las siete migraciones en MySQL 8.4 y arranca la API para comprobar su endpoint de salud conectado a MySQL. |
| **Frontend build** | Instala exactamente las dependencias fijadas en el lockfile y compila el frontend React/Vite. |

El job de backend mantiene un mínimo de **20 pruebas**, no permite pruebas
marcadas como omitidas o pendientes y exige al menos **85% de líneas, 70% de
ramas y 70% de funciones** en la cobertura reportada por Node.js. El umbral de
pruebas impide que la suite desaparezca accidentalmente; la cobertura evita
que el mero número de pruebas sea suficiente. Ambos valores deben elevarse
cuando el conjunto de pruebas crezca, no reducirse para hacer pasar un cambio.

La inspección de comprobaciones desactivadas revisa los workflows, el código
backend cubierto y sus pruebas. Rechaza pruebas `skip`, `only` o `todo`,
directivas de cobertura ignorada, pasos de workflow que continúan tras un
fallo y comandos de shell que convierten un error en éxito. No es un análisis
estático general ni sustituye la revisión de cambios.

## MySQL e integración de aplicación

CI inicia una base de datos desechable vacía usando MySQL 8.4.3. Ejecuta
`npm --prefix backend run db:migrate`; cualquier error de SQL o validación de
datos hace fallar el job. Luego `backend/src/server.js` comprueba las tablas y
columnas requeridas al iniciar, y `backend/scripts/verify-ci-database.js`
consulta `GET /api/health`. La respuesta debe ser HTTP exitosa y contener
`{"message":"Backend funcionando","database":"mysql"}`.

Esto verifica migraciones y una ruta de aplicación que depende de MySQL; es
más que una consulta `SELECT 1`. No implica que todos los flujos funcionales
estén cubiertos por pruebas de integración: las pruebas existentes también
contienen pruebas unitarias, y los siguientes incrementos deben añadir pruebas
de integración para operaciones y permisos de negocio relevantes.

## Ejecución local

Con dependencias instaladas, Node.js 22 y MySQL accesible con la configuración
de `backend/.env`, ejecuta:

```bash
bash scripts/ci-local.sh
```

También se pueden ejecutar las barreras backend individualmente:

```bash
node backend/scripts/check-ci-bypasses.js
npm --prefix backend run test:ci
npm --prefix backend run db:migrate
npm --prefix backend run ci:smoke
npm --prefix frontend run build
```

El script local mantiene el modo offline existente: no descarga Gitleaks ni
consulta el registro de npm para auditoría. Por lo tanto, solo el workflow de
GitHub Actions es evidencia de esas dos comprobaciones.

## Estado y evidencia en GitHub

Los archivos del repositorio definen las comprobaciones, pero no pueden
demostrar que GitHub Actions ya haya ejecutado una revisión. Para obtener esa
evidencia, sube el cambio y consulta la pestaña **Actions** o los checks del
pull request. El resumen de pruebas publica los conteos de pruebas y umbrales
de cobertura en el resumen de la ejecución; los logs conservan la salida de
migraciones y del smoke test.

Para bloquear merges, configura en GitHub las reglas de protección de `main` y
`karla-branch` y marca como requeridos los checks **Secret scan**,
**Dependency audit**, **Backend tests and MySQL integration** y **Frontend
build**. Los archivos del repositorio no pueden establecer esa configuración
de rama ni capturar una ejecución antes de que el workflow corra.
