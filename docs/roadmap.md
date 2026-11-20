# Roadmap de EduMatch

## Propósito

Este roadmap describe la dirección de evolución de EduMatch y organiza el
trabajo según la arquitectura, las reglas de negocio y las tarjetas existentes
en el backlog.

La prioridad es completar la integración React, Express y MySQL sin introducir
mensajería interna ni servicios institucionales que no estén disponibles. El
estado de este documento debe revisarse junto con [`backlog.md`](./backlog.md),
[`architecture.md`](./architecture.md) y [`business-rules.md`](./business-rules.md).

## Estado actual

EduMatch ya cuenta con una base técnica integrada:

- Frontend React 19 servido por Vite.
- Backend Express con autorización por rol y sesiones MySQL.
- Inicio institucional mediante Microsoft Entra ID para alumnos y tutores.
- Inicio administrado por contraseña únicamente para administradores.
- Catálogos públicos, registro institucional pendiente de aprobación y revisión
  administrativa básica.
- Consulta de tutores, disponibilidad semanal, solicitudes de tutoría,
  aceptación, programación y estados de sesiones.
- Modelo MySQL para conexiones, calificaciones, evaluaciones, archivos,
  matrículas, catálogos académicos y eventos de aprobación.

Las tarjetas EDU-003, EDU-006, EDU-008 y EDU-010 todavía no tienen
implementación completa. También deben reconciliarse los estados documentales
de EDU-004 y EDU-009 con el código y las pruebas existentes antes de marcarles
como completadas.

EduMatch no incluye mensajería interna. Las relaciones disponibles deben
representarse mediante solicitudes y conexiones de tutoría.

## 1. Acceso seguro y gestión de cuentas

**Estado:** En progreso.

**Objetivo:** consolidar autenticación, aprobación y separación de permisos
entre estudiantes, tutores y administradores.

### Trabajo incluido

- Mantener sesiones con cookie HttpOnly y autorización verificable en backend.
- Conservar Microsoft SSO como entrada institucional para alumnos y tutores.
- Mantener el inicio con contraseña exclusivamente para cuentas
  administrativas.
- Completar la aprobación y rechazo de cuentas por administradores.
- Impedir que una cuenta pendiente acceda a acciones protegidas.
- Mantener perfiles separados de los datos de autenticación.

### Resultado verificable

- Cada rol puede iniciar sesión por el flujo autorizado.
- El backend rechaza roles o estados no aprobados.
- El frontend muestra únicamente las acciones correspondientes a la sesión.
- Los cambios administrativos quedan asociados al administrador revisor.

### Tarjetas relacionadas

- EDU-001: Control de acceso.
- EDU-004: Autenticación mediante Microsoft.
- EDU-009: Administración de cuentas y perfiles.

## 2. Información académica y registro

**Estado:** En progreso.

**Objetivo:** utilizar catálogos oficiales y reglas verificables para carreras,
campus, materias y perfiles académicos.

### Trabajo incluido

- Publicar únicamente carreras y campus activos.
- Mantener matrículas con formato de 11 dígitos y estado pendiente de
  verificación manual.
- Resolver perfiles heredados o datos inválidos antes de aplicar restricciones
  estrictas.
- Completar la administración autorizada de catálogos académicos.
- Relacionar materias con carreras y semestres desde `career_subjects`.
- Impedir el registro o la búsqueda de materias no elegibles.

### Resultado verificable

- Los formularios reutilizan catálogos activos.
- Las matrículas no pasan a verificadas únicamente por cumplir formato.
- Las materias muestran únicamente opciones respaldadas por el currículo
  disponible.
- Los cambios de catálogo quedan protegidos y auditables.

### Tarjetas relacionadas

- EDU-005: Verificación institucional de matrículas.
- EDU-006: Administración de catálogos académicos.
- EDU-007: Registro y validación de materias de tutores.

**Restricción:** no se debe simular una fuente institucional ni inventar
carreras, campus o materias.

## 3. Gestión semanal de tutores

**Estado:** En progreso.

**Objetivo:** completar la administración de disponibilidad y tutorías semanales
dentro de las reglas académicas y de capacidad.

### Trabajo incluido

- Permitir que tutores aprobados administren horas disponibles.
- Mostrar disponibilidad únicamente a estudiantes autorizados.
- Validar semanas, días hábiles y horarios permitidos.
- Limitar la tutoría a un máximo de 15 estudiantes distintos por semana.
- Permitir solicitudes, aceptación, rechazo y finalización.
- Mantener sesiones independientes de programación, finalización y cancelación.
- Evitar solicitudes duplicadas y conflictos de horario.

### Resultado verificable

- Tutor y estudiante ven el estado correspondiente a su rol.
- Las operaciones respetan propiedad y conexión.
- Las capacidades y conflictos se validan en el backend.
- Los datos semanales permanecen asociados a la semana, tutor y estudiante.

### Tarjetas relacionadas

- EDU-002: Disponibilidad del tutor.
- EDU-007: Registro y validación de materias de tutores.
- EDU-009: Administración de cuentas y perfiles.

## 4. Conexiones, archivos y recursos académicos

**Estado:** Pendiente de implementación completa.

**Objetivo:** habilitar el intercambio seguro de recursos académicos entre
tutores y estudiantes aceptados sin crear mensajería.

### Trabajo incluido

- Mantener la conexión como unidad autorizada de tutoría.
- Validar conexión, tutor, estudiante y estado en cada operación.
- Implementar carga y almacenamiento protegido de archivos.
- Validar MIME, tamaño y nombre del recurso.
- Permitir descarga exclusiva a participantes autorizados.
- Mantener metadatos en MySQL y contenido en almacenamiento protegido.

### Resultado verificable

- Un tutor puede enviar un archivo solo a un estudiante conectado.
- Un estudiante consulta solo archivos de sus conexiones válidas.
- Los enlaces públicos no exponen archivos.
- Los formatos, tamaños y estados se rechazan en backend.

### Tarjetas relacionadas

- EDU-003: Envío y acceso seguro a archivos.

## 5. Calificaciones y evaluaciones

**Estado:** Pendiente de integración.

**Objetivo:** conservar por separado las opiniones de estudiantes sobre tutores
y las evaluaciones académicas de tutores sobre estudiantes.

### Trabajo incluido

- Completar calificaciones de estudiantes hacia tutores.
- Completar evaluaciones de tutores hacia estudiantes.
- Exigir una conexión válida para cada registro.
- Impedir calificaciones duplicadas según la política definida.
- Limitar comentarios a 50 caracteres.
- Mostrar calificaciones en el perfil correspondiente.
- Mantener fechas de creación sin reemplazar el historial.

### Resultado verificable

- Los estudiantes no pueden calificar tutorías ajenas.
- Los tutores no pueden evaluar estudiantes fuera de una conexión válida.
- Cada dirección de evaluación tiene autorización independiente.
- No se confunden calificaciones con evaluaciones académicas.

### Tarjetas relacionadas

- EDU-008: Sistema de calificaciones y evaluaciones.

## 6. Administración y auditoría

**Estado:** Pendiente de consolidación.

**Objetivo:** ofrecer al administrador herramientas completas de supervisión,
aprobación y trazabilidad.

### Trabajo incluido

- Completar consulta y gestión de cuentas y perfiles.
- Registrar aprobación, rechazo y suspensión con revisor y fecha.
- Añadir la auditoría administrativa necesaria para cambios relevantes.
- Restringir consultas y modificaciones a cuentas administrativas.
- Evitar modificaciones administrativas por usuarios comunes.
- Conservar registros históricos y no permitir su modificación.

### Resultado verificable

- Solo un administrador autenticado realiza decisiones protegidas.
- Cada acción relevante identifica al revisor y la hora.
- Los registros pueden consultarse solo mediante autorización.
- Los cambios afectan el acceso efectivo de la cuenta revisada.

### Tarjetas relacionadas

- EDU-009: Administración de cuentas y perfiles.
- EDU-010: Registro de auditoría administrativa.

## 7. Integración, calidad y entrega

**Estado:** Planificado.

**Objetivo:** verificar que el sistema completo cumple las reglas de negocio y
no introduce fallos de integración o seguridad.

### Trabajo incluido

- Ejecutar pruebas unitarias e integración del backend.
- Ejecutar pruebas funcionales del frontend.
- Verificar aprobación, roles, sesiones y recursos protegidos.
- Ejecutar pruebas de regresión sobre tutoría, disponibilidad y administración.
- Revisar validaciones de datos y límites de caracteres.
- Actualizar documentación técnica y resultados de pruebas.
- Preparar la base de datos y el entorno de ejecución.

### Resultado verificable

- Los criterios de las tarjetas completadas tienen evidencia.
- No existen errores críticos conocidos en el alcance entregado.
- La documentación coincide con la arquitectura e implementación.
- Los cambios están preparados para revisión y fusión mediante el proceso
  establecido.

## Secuencia recomendada

Las etapas pueden solaparse, pero el orden recomendado es:

1. Consolidar autenticación, aprobación y control de acceso.
2. Completar catálogos académicos y verificación manual de matrículas.
3. Validar tutorías semanales, solicitudes y disponibilidad.
4. Implementar archivos protegidos sobre conexiones aceptadas.
5. Completar calificaciones y evaluaciones con permisos separados.
6. Consolidar administración y auditoría.
7. Ejecutar integración, calidad y preparación de entrega.

## Dependencias principales

- EDU-003 depende de EDU-001 y de una conexión aceptada.
- EDU-005 depende de EDU-001 y de un proceso administrativo externo
  verificable.
- EDU-006 depende de EDU-001.
- EDU-007 depende de EDU-001 y de catálogos académicos activos.
- EDU-008 depende de EDU-001 y de tutorías o conexiones válidas.
- EDU-009 depende de EDU-001 y de la autenticación institucional o
  administrativa correspondiente.
- EDU-010 depende de EDU-001 y EDU-009.

## Seguimiento

Los estados del roadmap se interpretan así:

| Estado | Significado |
| --- | --- |
| Planned | El trabajo está definido, pero todavía no se inició. |
| In progress | Existe implementación o integración parcial que debe completarse. |
| Completed | El objetivo y sus criterios verificables están cumplidos. |
| On hold | El avance depende de una decisión, dato oficial o dependencia externa. |

Una etapa no se marcará como Completed solo porque exista código relacionado.
Deberá demostrar reglas de negocio, pruebas, documentación y cobertura de sus
criterios de aceptación.

## Mantenimiento

Este roadmap debe actualizarse cuando:

- una tarjeta cambie de estado o criterio;
- se complete o descubra una integración real;
- cambie una dependencia técnica o académica;
- aparezca una fuente oficial para catálogos o matrículas;
- se modifique una decisión de arquitectura o negocio.
