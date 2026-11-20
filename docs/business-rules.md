# Reglas de negocio de EduMatch

## 1. Cuentas, autenticación y permisos

### BR-001. Acceso según aprobación y rol

Solo las cuentas aprobadas pueden acceder a las funcionalidades correspondientes a su rol. Cada rol debe tener permisos específicos y el backend debe validar las autorizaciones.

### BR-002. Aprobación y disponibilidad de tutores

Un tutor debe tener un perfil aprobado para aparecer en las búsquedas. Además, únicamente puede aparecer cuando `is_available = TRUE`.

### BR-003. Autenticación institucional y propia

EduMatch utiliza Microsoft para validar las credenciales institucionales. Nunca recibe ni almacena las contraseñas institucionales. Para las cuentas con contraseña propia, como administración, almacena únicamente hashes seguros de las contraseñas.

### BR-004. Administración de cuentas

El administrador es una cuenta con rol administrativo. No requiere una tabla de contraseñas separada ni permite el registro público de cuentas administrativas. La cuenta inicial debe provisionarse mediante un proceso controlado fuera de la aplicación pública.

### BR-005. Permisos administrativos

Solo los administradores autenticados y autorizados pueden modificar perfiles de otros usuarios, administrar catálogos y realizar acciones de aprobación o rechazo.

### BR-006. Estados de cuenta

Las cuentas deben manejar estados de aprobación definidos, como `Pending`, `Approved`, `Rejected` y `Suspended`. Cada estado determina las funcionalidades a las que puede acceder el usuario.

## 2. Conexiones y relaciones entre usuarios

### BR-007. Conexiones entre tutor y estudiante

Las operaciones que involucren información compartida entre tutores y estudiantes deben estar respaldadas por una conexión autorizada entre ambos.

### BR-008. Estados de conexión

Las conexiones deben manejar estados definidos, como `Pending`, `Accepted`, `Rejected` y `Finished`. El estado determina qué operaciones pueden realizar sus participantes.

### BR-009. Solicitudes de tutoría

El sistema debe evitar solicitudes duplicadas para una misma relación entre estudiante y tutor mientras exista una solicitud pendiente o una conexión activa, según las condiciones definidas para el negocio.

## 3. Archivos y seguridad de la información

### BR-010. Envío de archivos

Un archivo solo puede enviarse de un tutor a un estudiante mediante una conexión autorizada entre ambos.

### BR-011. Autorización de recursos compartidos

Las calificaciones, evaluaciones y archivos deben validar en el backend la existencia y el estado de una conexión autorizada antes de permitir su creación, consulta o modificación.

### BR-012. Protección de archivos

Los archivos deben cumplir los formatos y tamaños permitidos. Su consulta y descarga deben estar protegidas mediante autorización del backend. No deben exponerse mediante enlaces públicos sin protección.

## 4. Perfiles y validación de datos

### BR-013. Nombres y correos electrónicos

Los nombres de usuario y nombres de perfil solo aceptan letras, conforme a las reglas de caracteres definidas por el proyecto. El correo debe tener un formato válido, no contener espacios y ser único.

### BR-014. Matrícula y teléfono

La matrícula y el teléfono deben contener exactamente 11 dígitos. La unicidad de la matrícula no confirma su existencia. Se requiere una fuente oficial de la Universidad de Sonora para verificarla y debe permanecer pendiente hasta completar dicha verificación.

### BR-015. Catálogos académicos

Las carreras y campus deben utilizar referencias a catálogos. Solo las opciones activas pueden ofrecerse en nuevos registros. Los valores heredados se conservan inactivos hasta cotejarlos con los catálogos oficiales. No se deben inventar opciones oficiales.

### BR-016. Materias de tutores

Las materias que imparte un tutor deben estar vinculadas a su carrera y corresponder a su semestre actual o uno anterior. Las solicitudes nuevas deben incluir un promedio reportado entre 0 y 100 y permanecer pendientes de revisión administrativa. No se deben inventar materias ni semestres. El alta queda bloqueada hasta disponer del plan oficial correspondiente en `career_subjects`.

### BR-017. Límites de caracteres

La biografía y experiencia de un tutor tienen un máximo de 100 caracteres cada una. Los comentarios de calificaciones y evaluaciones tienen un máximo de 50 caracteres.

## 5. Calificaciones y evaluaciones

### BR-018. Diferencia entre calificación y evaluación

Una calificación realizada por un estudiante evalúa a un tutor. No debe confundirse con una evaluación del estudiante.

### BR-019. Integridad de calificaciones

Las calificaciones deben estar relacionadas con el tutor evaluado y una conexión autorizada. No se deben crear calificaciones duplicadas para una misma conexión cuando se establezca la política de una evaluación por conexión.

### BR-020. Conservación histórica de calificaciones

Las calificaciones registradas deben conservar su fecha de creación mediante `created_at`. No deben actualizarse automáticamente ni perder su historial.

## 6. Auditoría y administración

### BR-021. Registro de acciones administrativas

Las acciones administrativas importantes, como aprobaciones, rechazos y modificaciones de perfiles o catálogos, deben conservar un registro que identifique al administrador responsable, la acción realizada y su fecha y hora.

## 7. Restricciones generales del sistema

- La base de datos no contempla entidades de mensajes, conversaciones ni chat.
- Las validaciones de seguridad y reglas de negocio deben ejecutarse en el backend.
- Las opciones académicas deben provenir de fuentes oficiales verificables.
- No se deben eliminar registros históricos sin autorización.
- Las reglas de negocio no pueden modificarse por iniciativa del agente de desarrollo.
