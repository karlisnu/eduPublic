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
      "Usa **Try it out** para probar las rutas. Los estudiantes y tutores inician sesión con Microsoft SSO;",
      "los administradores usan `POST /api/login`. El navegador guarda la cookie HttpOnly.",
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
        summary: "Iniciar sesión de administrador y crear una sesión por cookie",
        description: "Estudiantes y tutores deben usar Microsoft SSO. Esta ruta acepta únicamente administradores.",
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
        summary: "Ruta de registro público retirada",
        description: "El registro solo se permite después de validar identidad institucional con Microsoft.",
        responses: {
          410: errorResponse,
        },
      },
    },
    "/api/auth/microsoft": {
      get: {
        tags: ["Registro"],
        summary: "Iniciar el acceso institucional Microsoft",
        description: "Estudiantes y tutores autentican sus credenciales directamente con Microsoft. El valor role puede ser alumno o tutor.",
        parameters: [
          {
            name: "role",
            in: "query",
            required: false,
            schema: { type: "string", enum: ["alumno", "tutor"], default: "alumno" },
          },
        ],
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
        summary: "Consultar el correo verificado de una solicitud de tutor pendiente",
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
        summary: "Enviar el registro de un tutor verificado por Microsoft",
        description: "La solicitud queda pendiente de aprobación administrativa. Las materias deben estar en el catálogo oficial de la carrera y no superar el semestre indicado.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MicrosoftTutorRegistrationRequest" },
            },
          },
        },
        responses: {
          201: jsonResponse("Solicitud de tutor creada y pendiente de aprobación", {
            type: "object",
            properties: {
              id: { type: "integer" },
              username: { type: "string" },
              role: { type: "string", example: "tutor" },
              accountStatus: { type: "string", example: "pending" },
              applicationStatus: { type: "string", example: "pending" },
            },
            required: ["id", "username", "role", "accountStatus", "applicationStatus"],
          }),
          400: errorResponse,
          401: errorResponse,
          409: errorResponse,
          503: errorResponse,
        },
      },
    },
    "/api/catalogs/tutor-subjects": {
      get: {
        tags: ["Catálogos"],
        summary: "Listar materias elegibles para un tutor",
        description: "Solo devuelve materias vinculadas al plan de estudios de la carrera que estén en el semestre actual o uno anterior.",
        parameters: [
          {
            name: "careerId",
            in: "query",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
          {
            name: "currentSemester",
            in: "query",
            required: true,
            schema: { type: "integer", minimum: 1 },
          },
        ],
        responses: {
          200: jsonResponse("Materias elegibles", {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "integer" },
                name: { type: "string" },
                semesterNumber: { type: "integer" },
              },
              required: ["id", "name", "semesterNumber"],
            },
          }),
          400: errorResponse,
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
        description: "Cookie HttpOnly creada por Microsoft SSO o `POST /api/login` para administradores.",
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
          username: { type: "string", description: "Usuario o correo del administrador" },
          identifier: { type: "string", description: "Alternativa a username" },
          password: { type: "string", format: "password" },
          role: { type: "string", enum: ["admin"] },
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
      MicrosoftTutorRegistrationRequest: {
        type: "object",
        properties: {
          username: { type: "string", minLength: 3, maxLength: 80, pattern: "^\\p{L}+$" },
          firstName: { type: "string", maxLength: 80 },
          lastName: { type: "string", maxLength: 120 },
          studentNumber: { type: "string", pattern: "^[0-9]{11}$" },
          careerId: { type: "integer", minimum: 1 },
          currentSemester: { type: "integer", minimum: 1 },
          average: { type: "number", minimum: 0, maximum: 100 },
          subjectIds: { type: "array", minItems: 1, uniqueItems: true, items: { type: "integer", minimum: 1 } },
          bio: { type: "string", maxLength: 100 },
          experience: { type: "string", minLength: 1, maxLength: 100 },
        },
        required: [
          "username", "firstName", "lastName", "studentNumber", "careerId",
          "currentSemester", "average", "subjectIds", "experience",
        ],
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
          login_identifier: { type: "string", pattern: "^[0-9]{11}$", nullable: true },
          role: { type: "string", enum: ["alumno", "tutor"] },
          account_status: { type: "string", example: "pending" },
          application_status: { type: "string", nullable: true, example: "pending" },
          first_name: { type: "string", nullable: true },
          last_name: { type: "string", nullable: true },
          career: { type: "string", nullable: true },
          current_semester: { type: "integer", nullable: true },
          average: { type: "number", nullable: true, minimum: 0, maximum: 100 },
          subjects: { type: "string", nullable: true },
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
