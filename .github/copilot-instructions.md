# EduMatch - Copilot Instructions

## 1. Project Context
EduMatch es una plataforma que conecta estudiantes con tutores para facilitar la búsqueda de apoyo académico.
El sistema permite gestionar cuentas, perfiles, materias, disponibilidad de tutores, conexiones entre estudiantes y tutores, archivos, calificaciones y administración.
Copilot debe comprender el contexto del proyecto antes de proponer o realizar cambios.
### General Requirements
•	Respetar la arquitectura y estructura existente del proyecto.
•	Reutilizar componentes, servicios, modelos y funciones existentes cuando sea posible.
•	Evitar duplicar lógica de negocio.
•	No introducir funcionalidades que no estén contempladas en los requisitos.
•	No inventar información institucional, académica o administrativa.
•	No implementar funcionalidades que contradigan las reglas del negocio.
## 2. Documentation and Sources of Truth
Antes de implementar cualquier cambio, consultar la documentación relacionada con la funcionalidad.
Documentación principal:
•	`docs/architecture.md`: arquitectura, componentes y límites actuales de integración.
•	`docs/data-model-es.md`, `backend/sql/schema.sql` y `backend/sql/migrations/`: modelo de datos y cambios del esquema.
•	`docs/backlog/`: tarjetas, requisitos y Acceptance Criteria, solo si existe contenido aplicable.
•	`backend/src/` y `frontend/src/`: implementación y convenciones vigentes; revisar junto con los requisitos, no asumir que el comportamiento actual define por sí solo la regla de negocio.
### Documentation Rules
•	Las reglas de negocio tienen prioridad sobre las suposiciones del agente.
•	Cada implementación debe respetar las reglas relacionadas con su tarjeta.
•	Consultar los Acceptance Criteria antes de comenzar una implementación.
•	No modificar las reglas de negocio sin autorización explícita.
•	Si existe información contradictoria, detener la implementación y solicitar aclaración.
•	No inventar requisitos para completar información faltante.
•	No asumir que un archivo o catálogo documental existe si no está presente en el repositorio.
•	No inventar carreras, campus, materias ni planes académicos; usar únicamente fuentes oficiales verificables y señalar cualquier dato pendiente de confirmación.
## 3. Backlog Management
Cuando una solicitud esté vinculada a una tarjeta, seguir su alcance y Acceptance Criteria. Si el trabajo requiere una tarjeta y no se proporcionó o no se encuentra, pedir aclaración en vez de inventarla. No bloquear una corrección pequeña y explícita solo porque no exista una tarjeta accesible.
### Card Types
•	Goal: objetivo general que agrupa varias funcionalidades.
•	Feature: funcionalidad nueva del sistema.
•	Task: trabajo técnico o actividad necesaria para implementar una funcionalidad.
•	Bug: comportamiento incorrecto que necesita corregirse.
### Priority Levels
•	P1 - High: prioridad alta. Funcionalidades esenciales, seguridad o problemas críticos.
•	P2 - Medium: prioridad media. Funcionalidades importantes que complementan el sistema.
•	P3 - Low: prioridad baja. Mejoras secundarias o ajustes que pueden esperar.
### Backlog Rules
•	No crear tarjetas duplicadas.
•	Mantener los IDs existentes.
•	Cada tarjeta debe tener una Description clara.
•	Cada tarjeta debe incluir Acceptance Criteria verificables.
•	Identificar las Dependencies antes de implementar.
•	No cambiar el Type o Priority sin justificación.
•	Dividir las Features grandes en Tasks cuando sea necesario.
•	No marcar una tarjeta como Done si sus Acceptance Criteria no se cumplen.
### Registro de errores y nuevos requerimientos durante la implementación
Cuando trabajes en una tarjeta del backlog y durante el análisis o la implementación detectes un error, problema, funcionalidad faltante, dependencia o nuevo requerimiento que no esté contemplado en la tarjeta original, deberás:

1. No ignorar el hallazgo: identifica y analiza qué ocurrió y cómo afecta al proyecto.
2. Crear una nueva tarjeta en el backlog: registra el error o requerimiento como una tarjeta independiente, utilizando el tipo correspondiente (Bug, Feature, Task o Goal). Debes agregarla directamente al archivo `docs/backlog.md`, respetando su estructura y formato actuales.
3. Documentar toda la información necesaria: incluye:
   - Identificador único y título.
   - Tipo de tarjeta.
   - Prioridad.
   - Estado.
   - Dependencia.
   - Descripción.
   - Reglas de negocio.
   - Criterios de aceptación.
4. Relacionar las tarjetas: indica de qué tarjeta surgió el hallazgo y establece la dependencia correspondiente si es necesaria.
5. Actualizar el estado: no marques la nueva tarjeta como Ready hasta que cumpla con la Definition of Ready.
6. Informar al usuario: explica qué encontraste, qué tarjeta creaste y confirma que quedó agregada a `docs/backlog.md`.

No agregues problemas hipotéticos como si fueran errores reales. Si no puedes confirmar la causa o el comportamiento, documenta el hallazgo como pendiente de investigación.

No amplíes el alcance de la tarjeta original sin autorización. Continúa con el trabajo solicitado siempre que sea posible y seguro hacerlo.
## 4. Implementation Workflow
Seguir este flujo antes y durante cada implementación:
1.	Identify: identificar la tarjeta y comprender su objetivo.
2.	Review: consultar las reglas del negocio y documentación relacionada.
3.	Inspect: revisar la estructura del proyecto y el código existente.
4.	Plan: revisar `git status`, identificar archivos afectados, cambios locales existentes, Dependencies y posibles riesgos.
5.	Implement: realizar los cambios necesarios sin alterar funcionalidades ajenas.
6.	Validate: ejecutar pruebas y comprobar los Acceptance Criteria.
7.	Report: explicar los cambios realizados, archivos afectados y resultados de las pruebas.
### Important
•	No comenzar a programar sin comprender el alcance y los criterios verificables de la tarea o tarjeta.
•	No implementar funcionalidades adicionales por iniciativa propia.
•	Si una tarea depende de otra que todavía no está implementada, informar antes de continuar.
•	Si se requiere una decisión de negocio, solicitar autorización.
•	Evitar modificaciones innecesarias en archivos que no pertenecen al alcance de la tarjeta.
•	Preservar los cambios locales preexistentes; no descartarlos ni sobrescribirlos. No incluir cambios ajenos al alcance al preparar un commit.
•	No crear commits, hacer push ni abrir Pull Requests salvo que el usuario lo solicite explícitamente.
## 5. Architecture and Code Quality
•	Respetar los patrones arquitectónicos existentes.
•	Mantener la separación de responsabilidades.
•	Evitar duplicación de código.
•	Utilizar nombres descriptivos y consistentes.
•	Mantener funciones y métodos con responsabilidades específicas.
•	Reutilizar servicios y validaciones existentes.
•	Evitar dependencias innecesarias.
•	No cambiar tecnologías, frameworks o estructura del proyecto sin autorización.
•	No eliminar código existente sin comprobar sus dependencias.
## 6. Backend and Business Logic
•	Las reglas de negocio deben validarse en el Backend.
•	No confiar exclusivamente en las validaciones del Frontend.
•	Validar los datos recibidos antes de procesarlos.
•	Verificar la identidad y los permisos del usuario en operaciones protegidas.
•	Comprobar la propiedad de los recursos antes de permitir su modificación o consulta.
•	Evitar accesos no autorizados mediante manipulación de IDs.
•	Utilizar respuestas HTTP adecuadas.
•	Mantener la integridad de los datos.
•	Evitar exponer información sensible en las respuestas de la API.
## 7. Authentication and Security
•	No almacenar contraseñas en texto plano.
•	Utilizar mecanismos seguros de Hashing para cuentas con contraseña propia.
•	La autenticación institucional debe delegarse a Microsoft.
•	Nunca solicitar ni almacenar contraseñas institucionales porque solo funciona con Microsoft para el flujo de entrada y creación de alumnos y tutores.
•	Validar los tokens de autenticación.
•	Aplicar autorización en cada operación protegida.
•	No exponer secretos, API Keys, tokens o credenciales en el código.
•	Utilizar variables de entorno para configuraciones sensibles.
•	No considerar que ocultar elementos de la interfaz equivale a proteger una funcionalidad.
## 8. Database and Data Integrity
•	Revisar los modelos y relaciones existentes antes de modificar la base de datos.
•	Respetar las Foreign Keys y restricciones existentes.
•	Evitar duplicar entidades o relaciones.
•	Utilizar migraciones para cambios en el esquema cuando corresponda.
•	No eliminar datos históricos sin autorización.
•	Mantener los registros relacionados correctamente.
•	No inventar tablas, columnas o relaciones sin justificar su necesidad.
•	No implementar entidades de mensajes, conversaciones o chat, ya que no forman parte del alcance actual de EduMatch.
## 9. Validation and Testing
Cada implementación debe contar con validaciones y pruebas adecuadas a su alcance.
### Testing Requirements
•	Crear o actualizar Unit Tests cuando corresponda.
•	Implementar Integration Tests para operaciones que involucren varios componentes.
•	Probar casos válidos e inválidos.
•	Verificar permisos y accesos no autorizados.
•	Probar los límites de las validaciones.
•	Comprobar que los cambios no rompan funcionalidades existentes.
•	No eliminar pruebas para conseguir que una ejecución sea exitosa.
•	No afirmar que las pruebas pasaron si no fueron ejecutadas correctamente.
### Acceptance Criteria Validation
Antes de considerar una tarjeta terminada:
•	Comprobar cada Acceptance Criteria.
•	Ejecutar las pruebas relacionadas.
•	Corregir los errores encontrados.
•	Informar cualquier criterio que no pudo verificarse.
## 10. Code Changes and Pull Requests
•	Realizar cambios pequeños y relacionados con la tarjeta asignada.
•	Evitar modificar archivos que no sean necesarios.
•	Mantener consistencia con el estilo del repositorio.
•	No incluir credenciales, archivos temporales o información sensible en los commits.
•	Proporcionar una descripción clara de los cambios.
•	Relacionar los Pull Requests con sus tarjetas correspondientes.
•	No considerar un Pull Request terminado únicamente porque el código compila.
## 11. Definition of Ready (DoR)
Una tarjeta está Ready cuando:
•	Su Description es clara.
•	Sus Acceptance Criteria están definidos.
•	Las reglas del negocio relacionadas están identificadas.
•	Sus Dependencies están disponibles o resueltas.
•	No existen dudas importantes que bloqueen su implementación.
## 12. Definition of Done (DoD)
Una tarjeta está Done cuando:
•	La implementación cumple sus Acceptance Criteria.
•	Respeta las reglas del negocio.
•	Las pruebas correspondientes fueron ejecutadas.
•	No existen errores conocidos relacionados con el cambio.
•	El código mantiene la arquitectura y convenciones del proyecto.
•	La documentación fue actualizada cuando corresponde.
•	Los cambios fueron revisados y aprobados mediante el flujo de trabajo establecido.
## 13. Agent Behavior
Copilot debe actuar como un asistente de desarrollo que prioriza la consistencia, seguridad y mantenibilidad del proyecto.
•	No asumir requisitos que no estén documentados.
•	No inventar información.
•	No modificar reglas del negocio por iniciativa propia.
•	Explicar las decisiones técnicas importantes.
•	Informar riesgos y limitaciones.
•	Solicitar aclaraciones cuando falte información esencial.
•	Priorizar soluciones simples y mantenibles.
•	Trabajar únicamente dentro del alcance autorizado.
### Main Principle
Every implementation must follow the project documentation, respect the business rules, satisfy the Acceptance Criteria and preserve the existing architecture.
