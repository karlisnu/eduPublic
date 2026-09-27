# Modelo de datos de EduMatch

## Propósito

Este documento describe el modelo relacional de datos usado por EduMatch. El esquema ejecutable de MySQL está disponible en [`backend/sql/schema.sql`](../backend/sql/schema.sql).

EduMatch conecta a estudiantes y tutores aprobados, admite la entrega de archivos académicos y separa las calificaciones de los tutores de las evaluaciones que los tutores hacen de los estudiantes. La plataforma no incluye mensajería ni chat interno.

## Diagrama de entidad-relación

```mermaid
erDiagram
    USERS ||--o| STUDENT_PROFILES : has
    USERS ||--o| TUTOR_PROFILES : has
    USERS ||--o{ APPROVAL_EVENTS : receives
    USERS ||--o{ APPROVAL_EVENTS : reviews
    CAREERS ||--o{ STUDENT_PROFILES : selected_for
    CAMPUSES ||--o{ STUDENT_PROFILES : selected_for
    TUTOR_PROFILES }o--o{ SUBJECTS : teaches
    TUTOR_PROFILES ||--o{ TUTOR_STUDENT_CONNECTIONS : manages
    STUDENT_PROFILES ||--o{ TUTOR_STUDENT_CONNECTIONS : requests
    TUTOR_STUDENT_CONNECTIONS ||--o{ TUTOR_RATINGS : receives
    TUTOR_STUDENT_CONNECTIONS ||--o{ STUDENT_EVALUATIONS : contains
    TUTOR_STUDENT_CONNECTIONS ||--o{ ACADEMIC_FILES : authorizes
    TUTOR_PROFILES ||--o{ TUTOR_RATINGS : receives
    STUDENT_PROFILES ||--o{ TUTOR_RATINGS : writes
    TUTOR_PROFILES ||--o{ STUDENT_EVALUATIONS : writes
    STUDENT_PROFILES ||--o{ STUDENT_EVALUATIONS : receives
    TUTOR_PROFILES ||--o{ ACADEMIC_FILES : sends
    STUDENT_PROFILES ||--o{ ACADEMIC_FILES : receives

    USERS {
        int id PK
        string username UK
        string email UK
        string password_hash
        enum role
        enum account_status
        datetime approved_at
        timestamp created_at
        timestamp updated_at
    }

    CAREERS {
        int id PK
        string name UK
        boolean is_active
    }

    CAMPUSES {
        int id PK
        string name UK
        boolean is_active
    }

    STUDENT_PROFILES {
        int user_id PK, FK
        string first_name
        string last_name
        string student_number UK
        enum student_number_verification_status
        datetime student_number_verified_at
        int career_id FK
        int campus_id FK
        string phone
    }

    TUTOR_PROFILES {
        int user_id PK, FK
        string first_name
        string last_name
        string bio max 100 chars
        string experience max 100 chars
        boolean is_available
        enum application_status
    }

    SUBJECTS {
        int id PK
        string name UK
        text description max 100 words
    }

    TUTOR_STUDENT_CONNECTIONS {
        int id PK
        int tutor_id FK
        int student_id FK
        enum requested_by
        enum status
        datetime requested_at
        datetime responded_at
        datetime ended_at
    }

    TUTOR_RATINGS {
        int id PK
        int connection_id FK
        int student_id FK
        int tutor_id FK
        int rating
        string review max 50 chars
        timestamp created_at
    }

    STUDENT_EVALUATIONS {
        int id PK
        int connection_id FK
        int tutor_id FK
        int student_id FK
        decimal score
        string comments max 50 chars
        timestamp evaluated_at
    }

    ACADEMIC_FILES {
        int id PK
        int connection_id FK
        int tutor_id FK
        int student_id FK
        string original_name
        string storage_key UK
        string mime_type
        bigint size_bytes
        timestamp created_at
    }

    APPROVAL_EVENTS {
        bigint id PK
        int user_id FK
        int reviewer_id FK
        enum decision
        string reason
        timestamp created_at
    }
```

## Tablas y responsabilidades

| Tabla | Responsabilidad |
| --- | --- |
| `users` | Autenticación, rol, estado de aprobación, nombre de usuario y correo |
| `careers`, `campuses` | Catálogos de carreras y campus; solo los registros activos se pueden seleccionar |
| `student_profiles` | Datos académicos y de contacto, y verificación de matrícula |
| `tutor_profiles` | Biografía, experiencia, indicador de disponibilidad y estado de solicitud |
| `subjects` | Catálogo de materias; conserva los nombres y limita descripciones a 100 palabras |
| `tutor_subjects` | Relación muchos a muchos entre tutores y materias |
| `tutor_student_connections` | Solicitudes y relaciones aceptadas entre estudiante y tutor |
| `tutor_ratings` | Calificaciones de estudiantes asignadas a tutores, de 1 a 5 |
| `student_evaluations` | Evaluaciones de tutores asignadas a estudiantes, de 0 a 100 |
| `academic_files` | Metadatos de archivos enviados por tutores a estudiantes aceptados |
| `approval_events` | Historial administrativo de decisiones de aprobación y cuentas |

## Reglas principales del negocio

1. Solo las cuentas aprobadas pueden acceder a todas sus capacidades según su rol.
2. Un tutor debe tener un perfil de tutor aprobado y solo puede aparecer en búsquedas cuando `is_available = TRUE`.
3. Un archivo solo puede enviarse de un tutor a un estudiante a través de su conexión.
4. Una calificación del estudiante evalúa a un tutor; no es lo mismo que una evaluación del estudiante.
5. Las calificaciones, evaluaciones y archivos deben autorizarse con una conexión existente entre estudiante y tutor en el backend.
6. Las contraseñas se almacenan como hashes, nunca como texto plano.
7. La base de datos no tiene entidad de mensaje, conversación ni chat.
8. Nombres de usuario y nombres de perfiles solo aceptan letras. El correo debe tener formato válido, sin espacios y ser único.
9. La matrícula y el teléfono deben tener exactamente 11 dígitos. La unicidad no confirma que la matrícula exista: se requiere una fuente oficial de la Universidad de Sonora y el estado permanece pendiente hasta verificarla.
10. Carrera y campus son referencias a catálogos; solo sus opciones activas deben ofrecerse. Los valores heredados se conservan inactivos hasta cotejarlos con catálogos oficiales; no inventar opciones oficiales.
11. Biografía y experiencia de tutor: máximo 100 caracteres cada una. Comentarios de calificaciones y evaluaciones: máximo 50 caracteres. Las calificaciones conservan `created_at` y no tienen actualización automática.
12. El administrador es una cuenta de `users` con rol `admin`; no requiere una tabla de contraseñas separada ni registro público. El administrador inicial se provisiona por un proceso controlado fuera de la aplicación pública. Solo administradores autenticados pueden modificar perfiles o crear eventos de aprobación; el backend debe autorizarlo.

## ¿Por qué existen archivos Markdown y SQL?

- Este archivo Markdown explica el modelo para el equipo, la documentación, las revisiones y las presentaciones.
- [`backend/sql/schema.sql`](../backend/sql/schema.sql) crea las tablas reales de MySQL, índices, claves foráneas y restricciones.

La migración [`backend/sql/migrations/002_apply_profile_data_rules.sql`](../backend/sql/migrations/002_apply_profile_data_rules.sql) actualiza bases existentes y conserva las carreras/campus heredados como inactivos. Antes de aplicar las nuevas restricciones, se deben revisar y corregir datos heredados inválidos (matrículas, teléfonos, nombres o textos demasiado largos); nunca se debe inventar una matrícula verificada.

La documentación, el esquema y las migraciones deben mantenerse alineados.

## Explicación de cada función / entidad

### `users`
Representa a cualquier persona registrada: estudiante, tutor o administrador. Guarda nombre de usuario (solo letras), correo único con formato válido, hash de contraseña, rol y estado de aprobación. Las cuentas de administrador usan el rol `admin`; no duplican credenciales en otra tabla y no se crean mediante registro público.

### `careers` y `campuses`
Son catálogos de referencia para las opciones de carrera y campus. Solo se ofrecen al estudiante los registros activos que se hayan cotejado con una fuente oficial de la Universidad de Sonora. Los valores antiguos se conservan como inactivos hasta verificarse; no se deben inventar opciones.

### `student_profiles`
Es la información académica y de contacto del estudiante. La matrícula y el teléfono contienen exactamente 11 dígitos. La matrícula tiene estado de verificación y solo debe marcarse verificada tras confirmarla con una fuente oficial de la Universidad de Sonora. Carrera y campus son claves foráneas a catálogos, no texto libre ni booleanos. Solo se deben ofrecer registros activos, previamente cargados desde datos oficiales.

### `tutor_profiles`
Es la información específica del tutor. Los nombres solo admiten letras; biografía y experiencia tienen un máximo de 100 caracteres. `is_available` es el indicador booleano de disponibilidad; se eliminó el campo textual `availability`.

### `subjects`
Es el catálogo de materias que pueden enseñar los tutores. Se conservan los nombres actuales; las descripciones permiten hasta 100 palabras.

### `tutor_subjects`
Es la relación entre tutores y materias. Un tutor puede enseñar muchas materias y una materia puede ser impartida por muchos tutores. Esto evita duplicar información y permite búsquedas por asignatura.

### `tutor_student_connections`
Representa la conexión entre un tutor y un estudiante. Registra quién lanzó la solicitud, su estado (pendiente, aceptada, rechazada, finalizada, etc.) y las fechas clave de solicitud, respuesta y cierre. Es la base para autorizar acciones como calificaciones, evaluaciones y archivos.

### `tutor_ratings`
Es la calificación que un estudiante da a un tutor, en una escala de 1 a 5. El comentario es opcional y de hasta 50 caracteres. `created_at` registra cuándo se creó; no existe actualización automática.

### `student_evaluations`
Es la evaluación que un tutor da a un estudiante, normalmente con un puntaje del 0 al 100 y comentarios opcionales de hasta 50 caracteres. Es distinta de la calificación que el estudiante asigna al tutor.

### `academic_files`
Guarda los metadatos de los archivos enviados por el tutor al estudiante dentro de una conexión autorizada. Incluye nombre original, nombre de almacenamiento en disco, tipo MIME, tamaño y fecha de creación. Esto permite gestionar archivos sin guardar el contenido binario de manera directa en la base de datos.

### `approval_events`
Registra el historial de decisiones administrativas sobre cuentas. Guarda quién revisó la solicitud, quién fue revisado, la decisión tomada y el motivo. Esto ayuda a auditoría, trazabilidad y seguimiento de aprobaciones y rechazos.
El backend debe confirmar que `reviewer_id` pertenece a un administrador autenticado; la clave foránea por sí sola solo confirma que el usuario existe.

## Resumen funcional

La base de datos está diseñada para separar:

- la identidad del usuario (`users`),
- los catálogos oficiales de carrera y campus (`careers`, `campuses`) y el perfil académico del estudiante (`student_profiles`),
- el perfil profesional del tutor (`tutor_profiles`),
- la relación académica entre ambos (`tutor_student_connections`),
- la reputación y evaluación de esa relación (`tutor_ratings`, `student_evaluations`),
- y la gestión documental (`academic_files` y `approval_events`).

Los nombres reales de las tablas MySQL se muestran entre paréntesis; el esquema ejecutable de [`backend/sql/schema.sql`](../backend/sql/schema.sql) es la referencia para sus nombres y columnas.
