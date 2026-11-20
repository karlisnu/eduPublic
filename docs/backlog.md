
# Backlog de EduMatch
## EDU-001. Control de acceso
- **Tipo:** Feature
- **Prioridad:** P1 - Alta
- **Estado:** Implementado
- **Dependencias:** Ninguna
### Descripción
Implementar un sistema de control de acceso que permita restringir las funcionalidades de EduMatch según el rol y el estado de aprobación de cada cuenta.
### Reglas de negocio
- Solo las cuentas aprobadas pueden acceder a las capacidades correspondientes a su rol.
- Cada usuario debe tener permisos de acuerdo con su tipo de cuenta.
- Los usuarios no autorizados no pueden acceder a funcionalidades restringidas.
### Criterios de aceptación
- [x] El sistema identifica el rol del usuario autenticado.
- [x] El sistema verifica que la cuenta esté aprobada.
- [x] Cada rol tiene acceso únicamente a las funcionalidades permitidas.
- [x] Los usuarios sin autorización reciben una respuesta de acceso denegado.
- [x] Las restricciones se aplican tanto en el frontend como en el backend.
---
## EDU-002. Disponibilidad del tutor
- **Tipo:** Feature
- **Prioridad:** P1 - Alta
- **Estado:** Ready propuesto
- **Dependencias:** EDU-001
### Descripción
Implementar la administración del estado de disponibilidad de los tutores para controlar cuándo pueden aparecer en los resultados de búsqueda.
### Reglas de negocio
- Un tutor debe tener un perfil aprobado.
- Un tutor solo puede aparecer en búsquedas cuando `is_available = TRUE`.
- La disponibilidad no sustituye la aprobación de la cuenta.
### Criterios de aceptación
- [ ] El tutor puede modificar su disponibilidad.
- [ ] El sistema almacena el estado de disponibilidad.
- [ ] Los tutores no disponibles no aparecen en las búsquedas.
- [ ] Los tutores sin aprobación no aparecen en las búsquedas.
- [ ] Los cambios de disponibilidad se reflejan en las consultas correspondientes.
---
## EDU-003. Envío y acceso seguro a archivos
- **Tipo:** Feature
- **Prioridad:** P1 - Alta
- **Estado:** Ready propuesto
- **Dependencias:** EDU-001
### Descripción
Implementar el envío, almacenamiento y consulta de archivos dentro de EduMatch, garantizando que únicamente los usuarios autorizados puedan acceder a ellos.
### Reglas de negocio
- Un archivo solo puede enviarse por usuarios autorizados.
- El acceso a los archivos debe respetar los permisos y relaciones entre usuarios.
- Los archivos no deben quedar disponibles públicamente.
### Criterios de aceptación
- [ ] Los usuarios autorizados pueden enviar archivos.
- [ ] El sistema valida el tipo y tamaño permitido de los archivos.
- [ ] Los archivos se almacenan de manera segura.
- [ ] Solo los usuarios autorizados pueden consultar o descargar los archivos.
- [ ] El sistema rechaza archivos que no cumplan las validaciones.
- [ ] Los usuarios no pueden acceder a archivos de otras relaciones sin autorización.
---
## EDU-004. Autenticación mediante Microsoft
- **Tipo:** Feature
- **Prioridad:** P1 - Alta
- **Estado:** Ready propuesto
- **Dependencias:** EDU-001
### Descripción
Implementar la autenticación mediante una cuenta Microsoft para permitir que los usuarios accedan a EduMatch utilizando el proveedor de identidad correspondiente.
### Reglas de negocio
- La autenticación debe realizarse mediante Microsoft.
- El sistema debe validar la identidad del usuario.
- La autenticación no implica que una cuenta esté aprobada automáticamente.
### Criterios de aceptación
- [ ] El usuario puede iniciar sesión mediante Microsoft.
- [ ] El sistema procesa correctamente la respuesta de autenticación.
- [ ] Se identifica la cuenta correspondiente al usuario.
- [ ] Se aplican las reglas de aprobación y permisos después de autenticar.
- [ ] El sistema informa cuando la autenticación falla.
- [ ] Las credenciales y tokens se manejan de manera segura.
---
## EDU-005. Verificación institucional de matrículas
- **Tipo:** Feature
- **Prioridad:** P1 - Alta
- **Estado:** Ready propuesto
- **Dependencias:** EDU-001
### Descripción
Permitir el registro y la verificación de matrículas para comprobar que un usuario pertenece a la Universidad de Sonora. La verificación se realizará mediante un proceso manual por parte de un administrador autorizado, sin depender de una API institucional.
### Reglas de negocio
- La matrícula debe cumplir con el formato establecido.
- No se permiten matrículas duplicadas.
- Una matrícula debe permanecer pendiente hasta ser revisada.
- Solo un administrador autorizado puede aprobar o rechazar una matrícula.
### Criterios de aceptación
- [ ] El sistema valida el formato de la matrícula.
- [ ] No se permiten matrículas duplicadas.
- [ ] Al registrarse, la matrícula queda en estado `Pending`.
- [ ] Un administrador autorizado puede revisar la información.
- [ ] El administrador puede aprobar o rechazar la solicitud.
- [ ] El sistema conserva el estado de verificación.
- [ ] Los usuarios no pueden aprobar sus propias matrículas.
- [ ] No se debe simular una conexión con servicios institucionales inexistentes.
---
## EDU-006. Administración de catálogos académicos
- **Tipo:** Feature
- **Prioridad:** P2 - Media
- **Estado:** Ready propuesto
- **Dependencias:** EDU-001
### Descripción
Permitir que los administradores gestionen los catálogos académicos de EduMatch, incluyendo carreras y campus de la Universidad de Sonora. La información será registrada y actualizada manualmente mediante fuentes oficiales disponibles.
### Reglas de negocio
- Solo los administradores autorizados pueden modificar los catálogos.
- Los registros deben basarse en información académica oficial.
- Los registros inactivos no deben aparecer en las opciones de selección.
### Criterios de aceptación
- [ ] Los administradores pueden registrar nuevas carreras y campus.
- [ ] Los administradores pueden editar la información existente.
- [ ] Los administradores pueden activar o desactivar registros.
- [ ] Solo los registros activos aparecen en formularios y búsquedas.
- [ ] Los registros inactivos se conservan en la base de datos.
- [ ] Los cambios quedan disponibles para las funcionalidades que utilizan los catálogos.
- [ ] No se deben inventar carreras ni campus.
---
## EDU-007. Registro y validación de materias de tutores
- **Tipo:** Feature
- **Prioridad:** P2 - Media
- **Estado:** Ready propuesto
- **Dependencias:** EDU-001, EDU-006
### Descripción
Permitir que los tutores registren las materias que pueden impartir, relacionándolas con su carrera y semestre correspondiente. Las materias disponibles provendrán del catálogo académico administrado dentro de EduMatch.
### Reglas de negocio
- Las materias deben pertenecer a una carrera registrada.
- Las materias deben estar relacionadas con el semestre correspondiente.
- No se deben permitir materias inexistentes en el catálogo.
- Los tutores deben contar con un perfil aprobado.
### Criterios de aceptación
- [ ] El tutor puede seleccionar su carrera desde el catálogo disponible.
- [ ] El tutor puede seleccionar las materias registradas para esa carrera.
- [ ] El sistema permite relacionar las materias con el semestre correspondiente.
- [ ] No se permiten materias que no existan en el catálogo.
- [ ] Los administradores autorizados pueden actualizar el catálogo de materias.
- [ ] Los cambios en los catálogos se reflejan en las opciones disponibles.
- [ ] El registro de materias no depende de una API institucional.
---
## EDU-008. Sistema de calificaciones y evaluaciones
- **Tipo:** Feature
- **Prioridad:** P2 - Media
- **Estado:** Ready propuesto
- **Dependencias:** EDU-001, EDU-002
### Descripción
Implementar un sistema que permita a los usuarios evaluar la experiencia de tutoría y registrar calificaciones sobre los tutores, de acuerdo con las reglas de EduMatch.
### Reglas de negocio
- Las evaluaciones deben estar relacionadas con una experiencia de tutoría válida.
- Un usuario no puede evaluar una tutoría en la que no participó.
- Las evaluaciones deben respetar las validaciones establecidas por el sistema.
### Criterios de aceptación
- [ ] El usuario autorizado puede registrar una evaluación.
- [ ] El sistema valida que exista una relación de tutoría válida.
- [ ] El usuario no puede duplicar evaluaciones para la misma experiencia.
- [ ] El sistema almacena la calificación y los comentarios permitidos.
- [ ] Las calificaciones se muestran en el perfil correspondiente.
- [ ] Los usuarios no autorizados no pueden modificar evaluaciones ajenas.
---
## EDU-009. Administración de cuentas y perfiles
- **Tipo:** Feature
- **Prioridad:** P1 - Alta
- **Estado:** Ready propuesto
- **Dependencias:** EDU-001, EDU-004
### Descripción
Implementar las funcionalidades administrativas para consultar, revisar y gestionar las cuentas y perfiles registrados en EduMatch.
### Reglas de negocio
- Solo los administradores autorizados pueden gestionar cuentas ajenas.
- Las cuentas deben conservar su información y estado.
- Los cambios administrativos deben respetar los permisos correspondientes.
### Criterios de aceptación
- [ ] El administrador puede consultar las cuentas registradas.
- [ ] El administrador puede revisar la información de los perfiles.
- [ ] El administrador puede aprobar o rechazar cuentas cuando corresponda.
- [ ] El administrador puede cambiar el estado de una cuenta según sus permisos.
- [ ] Los cambios se reflejan en el acceso del usuario.
- [ ] Los usuarios no pueden modificar el estado administrativo de sus propias cuentas.
---
## EDU-010. Registro de auditoría administrativa
- **Tipo:** Feature
- **Prioridad:** P2 - Media
- **Estado:** Ready propuesto
- **Dependencias:** EDU-001, EDU-009
### Descripción
Implementar un registro de auditoría para conservar información sobre las acciones administrativas realizadas dentro de EduMatch y facilitar su seguimiento.
### Reglas de negocio
- Las acciones administrativas relevantes deben quedar registradas.
- Los registros deben identificar al usuario que realizó la acción.
- Los usuarios sin permisos no pueden consultar ni modificar los registros de auditoría.
### Criterios de aceptación
- [ ] El sistema registra las acciones administrativas relevantes.
- [ ] Cada registro incluye el usuario responsable.
- [ ] Cada registro incluye la acción realizada y la fecha correspondiente.
- [ ] El sistema permite consultar el historial a administradores autorizados.
- [ ] Los registros no pueden ser modificados por usuarios comunes.
- [ ] El sistema conserva los registros de auditoría de acuerdo con las políticas de retención establecidas.