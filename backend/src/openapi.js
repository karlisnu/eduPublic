const errorResponse = {
  description: "La solicitud no se pudo completar",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
        required: ["error"],
      },
    },
  },
};

const jsonResponse = (description, schema) => ({
  description,
  content: {
    "application/json": { schema },
  },
});

const openapi = {
  openapi: "3.0.3",
  info: {
    title: "EduMatch API",
    version: "1.0.0",
    description: [
      "Documentación interactiva de la API de EduMatch.",
      "",
      "Usa **Try it out** para probar las rutas. Para las rutas protegidas,",
      "primero ejecuta `POST /api/login` con una cuenta aprobada. El navegador",
      "guardará la cookie HttpOnly y la enviará automáticamente a las rutas `/api`.",
      "Las rutas de tutor requieren rol `alumno`; las de aprobación requieren rol `admin`.",
      "",
      "Las cuentas de demostración se crean al ejecutar el seed local. No uses esas",
      "credenciales en producción.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Este backend" }],
  tags: [
    { name: "Sistema", description: "Estado y disponibilidad del servicio" },
    { name: "Autenticación", description: "Inicio, estado y cierre de sesión" },
    { name: "Registro", description: "Registro de usuarios y autenticación institucional" },
    { name: "Catálogos", description: "Datos disponibles para completar el registro" },
    { name: "Tutores", description: "Búsqueda de tutores por estudiantes autenticados" },
    { name: "Administración", description: "Revisión de solicitudes por administradores" },
  ],
  paths: {
    "/": {
      get: {
        tags: ["Sistema"],
        summary: "Información general de la API",
        responses: {
          200: jsonResponse("API disponible", {
            type: "object",
            properties: {
              message: { type: "string" },
              login: { type: "string", format: "uri" },
              endpoints: { type: "array", items: { type: "string" } },
              database: { type: "string", example: "mysql" },
            },
          }),
          503: errorResponse,
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["Sistema"],
        summary: "Comprobar el backend y la conexión con MySQL",
        responses: {
          200: jsonResponse("Backend y base de datos disponibles", {
            type: "object",
            properties: {
              message: { type: "string" },
              database: { type: "string", example: "mysql" },
            },
          }),
          503: errorResponse,
        },
      },
    },
    "/api/catalogs": {
      get: {
        tags: ["Catálogos"],
        summary: "Obtener carreras, campus y materias activos",
        responses: {
          200: jsonResponse("Catálogos disponibles", {
            type: "object",
            properties: {
              careers: { type: "array", items: { $ref: "#/components/schemas/CatalogEntry" } },
              campuses: { type: "array", items: { $ref: "#/components/schemas/CatalogEntry" } },
              subjects: { type: "array", items: { $ref: "#/components/schemas/CatalogEntry" } },
            },
            required: ["careers", "campuses", "subjects"],
          }),
          503: errorResponse,
        },
      },
    },
    "/api/login": {
      post: {
        tags: ["Autenticación"],
        summary: "Iniciar sesión y crear una sesión por cookie",
        description: "La respuesta establece la cookie HttpOnly `edumatch_session`.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: jsonResponse("Sesión iniciada", { $ref: "#/components/schemas/SessionUser" }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          503: errorResponse,
        },
      },
    },
    "/api/session": {
      get: {
        tags: ["Autenticación"],
        summary: "Consultar la sesión actual",
        security: [{ sessionCookie: [] }],
        responses: {
          200: jsonResponse("Usuario autenticado", { $ref: "#/components/schemas/SessionUser" }),
          401: errorResponse,
        },
      },
    },
    "/api/logout": {
      post: {
        tags: ["Autenticación"],
        summary: "Cerrar la sesión actual",
        security: [{ sessionCookie: [] }],
        responses: {
          204: { description: "Sesión cerrada" },
          503: errorResponse,
        },
      },
    },
    "/api/users": {
      post: {
        tags: ["Registro"],
        summary: "Registrar una cuenta de estudiante o tutor",
        description: "Las cuentas nuevas quedan pendientes de aprobación. No permite registrar administradores.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/StudentRegistrationRequest" },
                  { $ref: "#/components/schemas/TutorRegistrationRequest" },
                ],
              },
            },
          },
        },
        responses: {
          201: jsonResponse("Cuenta creada y pendiente de aprobación", {
            type: "object",
            properties: {
              id: { type: "integer" },
              username: { type: "string" },
              role: { type: "string", enum: ["alumno", "tutor"] },
              accountStatus: { type: "string", example: "pending" },
              applicationStatus: { type: "string", example: "pending" },
              studentNumberVerificationStatus: { type: "string", example: "pending" },
            },
            required: ["id", "username", "role", "accountStatus"],
          }),
          400: errorResponse,
          409: errorResponse,
          503: errorResponse,
        },
      },
    },
    "/api/auth/microsoft": {
      get: {
        tags: ["Registro"],
        summary: "Iniciar el acceso institucional Microsoft",
        description: "Redirige al inicio de sesión institucional de Universidad de Sonora.",
        responses: {
          302: { description: "Redirección a Microsoft o al frontend" },
        },
      },
    },
    "/api/auth/microsoft/callback": {
      get: {
        tags: ["Registro"],
        summary: "Procesar la respuesta de autenticación Microsoft",
        description: "Ruta de retorno registrada en Microsoft Entra; normalmente no se invoca manualmente.",
        parameters: [
          {
            name: "code",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Código de autorización emitido por Microsoft",
          },
          {
            name: "state",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Valor anti-CSRF asociado a la transacción",
          },
        ],
        responses: {
          302: { description: "Redirección al frontend tras autenticar o informar un error" },
        },
      },
    },
    "/api/auth/microsoft/registration": {
      get: {
        tags: ["Registro"],
        summary: "Consultar el correo de un registro institucional pendiente",
        responses: {
          200: jsonResponse("Correo institucional verificado", {
            type: "object",
            properties: { email: { type: "string", format: "email" } },
            required: ["email"],
          }),
          401: errorResponse,
          503: errorResponse,
        },
      },
      post: {
        tags: ["Registro"],
        summary: "Completar el perfil de un estudiante verificado por Microsoft",
        description: "El registro institucional se inicia desde `/api/auth/microsoft`; el token temporal se conserva en una cookie HttpOnly.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MicrosoftStudentRegistrationRequest" },
            },
          },
        },
        responses: {
          201: jsonResponse("Cuenta creada y pendiente de aprobación", {
            type: "object",
            properties: {
              role: { type: "string", example: "alumno" },
              accountStatus: { type: "string", example: "pending" },
            },
            required: ["role", "accountStatus"],
          }),
          400: errorResponse,
          401: errorResponse,
          409: errorResponse,
          503: errorResponse,
        },
      },
    },
    "/api/tutors": {
      get: {
        tags: ["Tutores"],
        summary: "Buscar tutores disponibles",
        description: "Solo devuelve tutores aprobados y disponibles. Requiere una sesión de estudiante.",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "subject",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Filtrar por nombre de materia",
          },
        ],
        responses: {
          200: jsonResponse("Tutores encontrados", {
            type: "array",
            items: { $ref: "#/components/schemas/Tutor" },
          }),
          401: errorResponse,
          403: errorResponse,
          503: errorResponse,
        },
      },
    },
    "/api/tutors/{id}": {
      get: {
        tags: ["Tutores"],
        summary: "Consultar el perfil de un tutor",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          200: jsonResponse("Perfil del tutor", { $ref: "#/components/schemas/Tutor" }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          503: errorResponse,
        },
      },
    },
    "/api/admin/approvals/pending": {
      get: {
        tags: ["Administración"],
        summary: "Listar solicitudes de aprobación pendientes",
        security: [{ sessionCookie: [] }],
        responses: {
          200: jsonResponse("Solicitudes pendientes", {
            type: "array",
            items: { $ref: "#/components/schemas/PendingApproval" },
          }),
          401: errorResponse,
          403: errorResponse,
          503: errorResponse,
        },
      },
    },
    "/api/admin/users/{id}/approval": {
      patch: {
        tags: ["Administración"],
        summary: "Aprobar o rechazar una cuenta pendiente",
        description: "Solo administradores pueden revisar solicitudes. La decisión queda registrada en el historial de aprobación.",
        security: [{ sessionCookie: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ApprovalDecisionRequest" },
            },
          },
        },
        responses: {
          200: jsonResponse("Decisión registrada", {
            type: "object",
            properties: {
              id: { type: "integer" },
              role: { type: "string", enum: ["alumno", "tutor"] },
              accountStatus: { type: "string", enum: ["approved", "rejected"] },
            },
            required: ["id", "role", "accountStatus"],
          }),
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
          503: errorResponse,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "edumatch_session",
        description: "Cookie HttpOnly creada por `POST /api/login`; autentícate desde Swagger UI para que el navegador la guarde.",
      },
    },
    schemas: {
      CatalogEntry: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
        },
        required: ["id", "name"],
      },
      LoginRequest: {
        type: "object",
        properties: {
          username: { type: "string", description: "Matrícula del estudiante, o usuario/correo de tutor o administrador" },
          identifier: { type: "string", description: "Alternativa a username" },
          password: { type: "string", format: "password" },
          role: { type: "string", enum: ["alumno", "tutor", "admin"] },
        },
        required: ["password", "role"],
        anyOf: [{ required: ["username"] }, { required: ["identifier"] }],
      },
      SessionUser: {
        type: "object",
        properties: {
          id: { type: "integer" },
          username: { type: "string" },
          role: { type: "string", enum: ["alumno", "tutor", "admin"] },
        },
        required: ["id", "username", "role"],
      },
      StudentRegistrationRequest: {
        type: "object",
        properties: {
          username: { type: "string", minLength: 3, maxLength: 80, description: "Solo letras, incluidas letras acentuadas" },
          password: { type: "string", format: "password", minLength: 6, description: "Debe incluir mayúscula, número y carácter especial" },
          email: { type: "string", format: "email", maxLength: 255 },
          role: { type: "string", enum: ["alumno"] },
          firstName: { type: "string", maxLength: 80 },
          lastName: { type: "string", maxLength: 120 },
          studentNumber: { type: "string", pattern: "^[0-9]{11}$" },
          careerId: { type: "integer", minimum: 1 },
          campusId: { type: "integer", minimum: 1 },
          phone: { type: "string", pattern: "^[0-9]{11}$" },
        },
        required: ["username", "password", "email", "role", "firstName", "lastName", "studentNumber", "careerId", "campusId", "phone"],
      },
      TutorRegistrationRequest: {
        type: "object",
        properties: {
          username: { type: "string", minLength: 3, maxLength: 80, description: "Solo letras, incluidas letras acentuadas" },
          password: { type: "string", format: "password", minLength: 6, description: "Debe incluir mayúscula, número y carácter especial" },
          email: { type: "string", format: "email", maxLength: 255 },
          role: { type: "string", enum: ["tutor"] },
          firstName: { type: "string", maxLength: 80 },
          lastName: { type: "string", maxLength: 120 },
          bio: { type: "string", maxLength: 100 },
          experience: { type: "string", minLength: 1, maxLength: 100 },
        },
        required: ["username", "password", "email", "role", "firstName", "lastName", "experience"],
      },
      MicrosoftStudentRegistrationRequest: {
        type: "object",
        properties: {
          username: { type: "string", minLength: 3, maxLength: 80 },
          firstName: { type: "string", maxLength: 80 },
          lastName: { type: "string", maxLength: 120 },
          studentNumber: { type: "string", pattern: "^[0-9]{11}$" },
          phone: { type: "string", pattern: "^[0-9]{11}$" },
          careerId: { type: "integer", minimum: 1 },
          campusId: { type: "integer", minimum: 1 },
        },
        required: ["username", "firstName", "lastName", "studentNumber", "phone", "careerId", "campusId"],
      },
      Tutor: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          subject: { type: "string", description: "Materias separadas por coma" },
          experience: { type: "string" },
          rating: { type: "number", minimum: 0 },
          bio: { type: "string", nullable: true },
          is_available: { type: "boolean" },
        },
        required: ["id", "name", "subject", "experience", "rating", "is_available"],
      },
      PendingApproval: {
        type: "object",
        properties: {
          id: { type: "integer" },
          username: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", enum: ["alumno", "tutor"] },
          account_status: { type: "string", example: "pending" },
          application_status: { type: "string", nullable: true, example: "pending" },
        },
        required: ["id", "username", "email", "role", "account_status"],
      },
      ApprovalDecisionRequest: {
        type: "object",
        properties: {
          decision: { type: "string", enum: ["approved", "rejected"] },
          reason: { type: "string", maxLength: 1000 },
        },
        required: ["decision"],
      },
    },
  },
};

module.exports = openapi;
