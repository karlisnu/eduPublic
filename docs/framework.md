# Framework de trabajo de EduMatch

## 1. Propósito

Este documento establece la metodología de trabajo que se utilizará durante la planificación, desarrollo, implementación y aseguramiento de calidad del proyecto EduMatch.

Su objetivo es mantener un proceso organizado, trazable y consistente, permitiendo que los integrantes del equipo y los agentes de inteligencia artificial trabajen bajo las mismas reglas.

El framework se divide en tres niveles:

- L1 - Planificación: definición y organización del trabajo.
- L2 - Implementación: ejecución de las tarjetas y gestión de cambios.
- L3 - Calidad: verificación, pruebas y aceptación del trabajo realizado.

## 2. Documentos de referencia

Los siguientes archivos complementan este framework:

| Archivo | Responsabilidad |
| --- | --- |
| `copilot-instructions.md` | Instrucciones generales y procedimientos que Copilot debe seguir. |
| `project-context.md` | Contexto, objetivos y descripción de EduMatch. |
| `backlog.md` | Registro central de tarjetas de trabajo. |
| `roadmap.md` | Planificación de objetivos y etapas del proyecto. |
| `framework.md` | Metodología y reglas del proceso de trabajo. |

Los documentos deben mantenerse coherentes entre sí. Si una instrucción contradice otra, se deberá identificar el conflicto y solicitar su aclaración antes de aplicar un cambio que afecte el proyecto.

## 3. L1 - Planificación del trabajo

### 3.1. Organización mediante tarjetas

Todo trabajo que requiera planificación, seguimiento o implementación deberá registrarse mediante una tarjeta en `backlog.md`.

Las tarjetas permiten dividir los objetivos del proyecto en actividades concretas, definir responsabilidades y establecer cuándo un trabajo puede comenzar y cuándo se considera terminado.

### 3.2. Tipos de tarjetas

Se utilizarán los siguientes tipos:

| Tipo | Descripción |
| --- | --- |
| Feature | Implementación de una nueva funcionalidad. |
| Bug | Corrección de un error existente. |
| Goal | Objetivo general que requiere uno o varios trabajos para alcanzarse. |
| Task | Actividad técnica, administrativa o de configuración necesaria para el proyecto. |

### 3.3. Información obligatoria de las tarjetas

Cada tarjeta deberá incluir, según corresponda:

- Identificador único.
- Título descriptivo.
- Tipo de tarjeta.
- Descripción.
- Justificación o contexto.
- Prioridad.
- Reglas de negocio.
- Criterios de aceptación.
- Dependencias.
- Estado.
- Evidencias o referencias relacionadas, cuando sean necesarias.

La información debe ser clara, verificable y suficiente para comprender qué debe realizarse sin depender de suposiciones.

### 3.4. Prioridades

Las prioridades se clasifican de la siguiente manera:

| Prioridad | Clasificación | Descripción |
| --- | --- | --- |
| P1 | Alta | Trabajo crítico o necesario para el funcionamiento de una parte esencial del sistema. |
| P2 | Media | Trabajo importante que aporta funcionalidad o mejora al sistema, pero no bloquea inmediatamente su funcionamiento. |
| P3 | Baja | Mejoras secundarias, optimizaciones o actividades que pueden realizarse posteriormente. |

La prioridad debe asignarse considerando el impacto, la urgencia y las dependencias del trabajo.

### 3.5. Definition of Ready (DoR)

Una tarjeta podrá pasar al estado Ready cuando cumpla las condiciones necesarias para comenzar su implementación.

Criterios:

- Tiene un título y una descripción comprensibles.
- Tiene un objetivo definido.
- Incluye criterios de aceptación verificables.
- Tiene identificadas sus reglas de negocio.
- Se conocen sus dependencias.
- Su alcance está delimitado.
- No presenta dudas importantes que impidan comenzar el trabajo.

Si falta información indispensable, la tarjeta permanecerá en Backlog hasta que sea aclarada.

### 3.6. Relación con el roadmap

El roadmap establece los objetivos y etapas generales de EduMatch.

El backlog convierte esos objetivos en tarjetas concretas que pueden planificarse, priorizarse e implementarse.

Las tarjetas relacionadas con un objetivo del roadmap deberán mantener una referencia que permita identificar a qué objetivo contribuyen.

## 4. L2 - Implementación

### 4.1. Inicio del trabajo

Una tarjeta solamente podrá comenzar su implementación cuando:

- Se encuentre en estado Ready.
- Cumpla con la Definition of Ready.
- Sus dependencias estén resueltas.
- El agente o integrante encargado tenga claro el alcance del trabajo.

Antes de implementar, se deberá revisar la tarjeta, sus criterios de aceptación, las reglas de negocio y la estructura actual del proyecto.

### 4.2. Análisis previo

Antes de realizar modificaciones se deberá:

1. Revisar el código y los componentes relacionados.
2. Identificar los archivos que podrían verse afectados.
3. Revisar las tecnologías y convenciones existentes.
4. Analizar las dependencias.
5. Identificar posibles impactos en funcionalidades existentes.
6. Determinar si el trabajo puede realizarse respetando la arquitectura actual.

No se deberán inventar tecnologías, servicios, endpoints, integraciones o funcionalidades que no estén respaldados por los requerimientos o por la estructura real del proyecto.

### 4.3. Reglas de implementación

Durante el desarrollo se deberá:

- Respetar las reglas de negocio.
- Cumplir todos los criterios de aceptación.
- Mantener la arquitectura y convenciones existentes.
- Evitar modificaciones fuera del alcance de la tarjeta.
- Reutilizar componentes cuando sea apropiado.
- Mantener el código organizado y comprensible.
- Evitar duplicación innecesaria.
- Considerar la seguridad y validación de los datos.
- No introducir dependencias innecesarias.
- No eliminar funcionalidades existentes sin autorización.

Cuando un requerimiento no esté suficientemente definido, se deberá solicitar una aclaración antes de tomar decisiones que puedan cambiar el comportamiento esperado del sistema.

### 4.4. Registro de errores y nuevos requerimientos

Durante el análisis o implementación pueden aparecer errores, problemas, funcionalidades faltantes, dependencias o nuevos requerimientos que no estén contemplados en la tarjeta original.

Cuando esto ocurra se deberá:

1. Identificar y analizar el hallazgo.
2. Determinar su impacto en el proyecto.
3. Crear una tarjeta independiente del tipo correspondiente (Bug, Feature, Task o Goal).
4. Documentar su descripción, causa conocida, impacto, prioridad, criterios de aceptación, dependencias y evidencias disponibles.
5. Relacionar la nueva tarjeta con la tarjeta original.
6. Agregarla directamente a `backlog.md`, respetando su estructura y sin eliminar ni reemplazar tarjetas existentes.
7. Mantenerla en Backlog hasta que cumpla la Definition of Ready.
8. Informar al usuario sobre el hallazgo y la nueva tarjeta registrada.

No se deberán registrar problemas hipotéticos como errores confirmados. Si se necesita investigar, deberá indicarse expresamente.

La creación de una nueva tarjeta no autoriza a ampliar el alcance de la tarjeta original.

El trabajo original podrá continuar siempre que el hallazgo no lo bloquee ni comprometa la seguridad o integridad del sistema.

### 4.5. Control de cambios

Los cambios deberán mantenerse relacionados con la tarjeta que los originó.

Si durante la implementación se requiere modificar el alcance, la arquitectura, las reglas de negocio o una funcionalidad existente, se deberá solicitar autorización antes de realizar cambios que excedan lo aprobado.

### 4.6. Pull Requests (PR)

Al finalizar una implementación, se deberá preparar un Pull Request para revisión.

El PR deberá incluir:

- Identificador y título de la tarjeta relacionada.
- Descripción de los cambios realizados.
- Archivos o componentes modificados.
- Criterios de aceptación atendidos.
- Pruebas ejecutadas y resultados.
- Evidencias cuando sean necesarias.
- Limitaciones o pendientes identificados.

El PR debe permitir comprender qué se modificó y por qué.

No se deberá considerar terminado el trabajo únicamente porque el código fue implementado o porque el PR fue creado.

La aprobación y fusión del PR deberán respetar el proceso de revisión establecido por el equipo. El agente no deberá aprobar ni fusionar sus propios cambios sin autorización.

## 5. L3 - Aseguramiento de calidad (QA)

### 5.1. Objetivo

Verificar que las implementaciones cumplan los requerimientos, criterios de aceptación y reglas de negocio, evitando que los cambios introduzcan errores o afecten funcionalidades existentes.

### 5.2. Verificaciones

Cada implementación deberá someterse a las verificaciones que correspondan:

- Revisión de criterios de aceptación.
- Validación de reglas de negocio.
- Pruebas unitarias.
- Pruebas de integración.
- Pruebas funcionales.
- Validación de entradas y salidas.
- Manejo de errores y excepciones.
- Verificación de permisos y roles.
- Revisión de seguridad.
- Pruebas de regresión cuando los cambios puedan afectar funcionalidades existentes.

No todas las tarjetas requieren todos los tipos de pruebas. La selección dependerá del alcance y del riesgo del cambio.

### 5.3. Validación de criterios de aceptación

Cada criterio de aceptación deberá verificarse individualmente.

Se deberá registrar si:

- Cumple.
- No cumple.
- No aplica, justificando el motivo.

No se deberá marcar un criterio como cumplido sin contar con evidencia suficiente.

### 5.4. Definition of Done (DoD)

Una tarjeta podrá considerarse Done cuando:

- Todos sus criterios de aceptación estén cumplidos.
- Las reglas de negocio estén respetadas.
- Las pruebas correspondientes hayan sido ejecutadas.
- No existan errores críticos o bloqueantes conocidos relacionados con el cambio.
- El código haya sido revisado.
- El PR haya sido aprobado y fusionado conforme al proceso del equipo.
- La documentación relacionada se haya actualizado cuando corresponda.
- Los cambios estén integrados correctamente en la rama correspondiente.

Si algún requisito no se cumple, la tarjeta no deberá marcarse como Done.

### 5.5. Gestión de errores encontrados durante QA

Si durante las pruebas o revisiones se detecta un error:

1. Documentar el comportamiento observado.
2. Identificar las condiciones en las que ocurre.
3. Registrar evidencias disponibles.
4. Evaluar el impacto.
5. Crear una tarjeta Bug en `backlog.md` cuando corresponda.
6. Relacionarla con la tarjeta o implementación donde se detectó.
7. Determinar si bloquea la aceptación del trabajo original.

Los errores que impidan cumplir los criterios de aceptación deberán corregirse antes de considerar terminada la tarjeta.

## 6. Estados de las tarjetas

El flujo de trabajo utilizará los siguientes estados:

| Estado | Significado |
| --- | --- |
| Backlog | Trabajo registrado, pendiente de preparación o priorización. |
| Ready | Trabajo definido y listo para comenzar. |
| In Progress | Trabajo actualmente en implementación. |
| In Review | Implementación terminada y pendiente de revisión. |
| Done | Trabajo revisado, aprobado e integrado. |

Las tarjetas deberán avanzar de acuerdo con las condiciones de cada estado. No se deberán cambiar estados únicamente para aparentar progreso.

## 7. Trazabilidad

Cada cambio deberá poder relacionarse con su tarjeta correspondiente.

La trazabilidad deberá permitir identificar:

- Qué requerimiento originó el trabajo.
- Qué tarjeta se implementó.
- Qué archivos fueron modificados.
- Qué PR contiene los cambios.
- Qué pruebas se realizaron.
- Qué resultados se obtuvieron.
- Qué errores o tareas adicionales surgieron.

Los nuevos hallazgos deberán mantener su relación con el trabajo que los originó.

## 8. Reglas generales del framework

1. El backlog es el registro central de los trabajos planificados.
2. Ninguna tarjeta deberá implementarse sin conocer su objetivo y alcance.
3. Los criterios de aceptación deben ser verificables.
4. No se deberán inventar requerimientos, servicios o integraciones.
5. Los hallazgos nuevos deberán registrarse en el backlog.
6. No se deberán modificar reglas de negocio sin autorización.
7. Las pruebas deben corresponder al alcance y riesgo del cambio.
8. Todo trabajo deberá contar con trazabilidad.
9. La implementación no equivale a aceptación.
10. La calidad debe verificarse antes de considerar terminado un trabajo.

## 9. Mantenimiento del framework

Este documento podrá actualizarse cuando el equipo determine que es necesario mejorar el proceso de trabajo.

Toda modificación deberá:

- Tener una justificación.
- Mantener coherencia con los demás documentos del proyecto.
- Evitar duplicar instrucciones que pertenecen a otros archivos.
- Ser revisada antes de incorporarse como regla oficial.

El framework define el proceso general de trabajo, mientras que las instrucciones generales y los procedimientos que Copilot debe seguir se mantienen en `copilot-instructions.md`.
