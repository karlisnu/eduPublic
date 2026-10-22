const DAY_COUNT = 5;
const FIRST_HOUR = 7;
const LAST_HOUR = 19;
const MAX_WEEKLY_STUDENTS = 15;
const { TutorRequestDto } = require("../dtos/tutor-request.dto");
const { TutorRequest } = require("../entities/tutor-request.entity");

function serviceError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function parseWeekStart(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw serviceError("La semana debe iniciar en una fecha válida (YYYY-MM-DD)");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw serviceError("La semana debe iniciar en una fecha válida (YYYY-MM-DD)");
  }
  if (date.getUTCDay() !== 1) {
    throw serviceError("Selecciona el lunes de la semana que deseas consultar");
  }
  return value;
}

function parseSlot(slot) {
  if (!slot || !Number.isInteger(slot.weekday) || slot.weekday < 1 ||
      slot.weekday > DAY_COUNT || !Number.isInteger(slot.startHour) ||
      slot.startHour < FIRST_HOUR || slot.startHour > LAST_HOUR) {
    throw serviceError("Los horarios deben estar entre lunes y viernes, de 7:00 a 20:00");
  }
  return { weekday: slot.weekday, startHour: slot.startHour };
}

function createTutorManagementService(repository) {
  async function getWeek(tutorId, rawWeekStart) {
    const weekStart = parseWeekStart(rawWeekStart);
    return { weekStart, maxWeeklyStudents: MAX_WEEKLY_STUDENTS, ...await repository.getWeek(tutorId, weekStart) };
  }

  async function saveAvailability(tutorId, body) {
    if (!body || typeof body.weekStart !== "string" || !Array.isArray(body.slots)) {
      throw serviceError("Envía la semana y la lista de horarios disponibles");
    }
    const weekStart = parseWeekStart(body.weekStart);
    const slots = body.slots.map(parseSlot);
    if (new Set(slots.map((slot) => `${slot.weekday}:${slot.startHour}`)).size !== slots.length) {
      throw serviceError("No repitas bloques horarios");
    }
    await repository.saveAvailability(tutorId, weekStart, slots);
    return { weekStart, slots };
  }

  async function decideRequest(tutorId, requestId, body) {
    if (!Number.isSafeInteger(requestId) || requestId < 1) {
      throw serviceError("El identificador de solicitud no es válido");
    }
    if (!["accepted", "rejected"].includes(body?.decision)) {
      throw serviceError("La decisión debe ser accepted o rejected");
    }
    return repository.decideRequest(
      tutorId,
      requestId,
      body.decision,
      ({ acceptedStudentExists, acceptedStudentCount, hasCompatibleAvailability }) => {
        if (body.decision !== "accepted") return;
        if (!acceptedStudentExists && acceptedStudentCount >= MAX_WEEKLY_STUDENTS) {
          throw serviceError("Ya alcanzaste el límite de 15 alumnos para esta semana", 409);
        }
        if (!hasCompatibleAvailability) {
          throw serviceError("No tienes un horario disponible compatible con esta solicitud", 409);
        }
      },
    );
  }

  async function scheduleStudent(tutorId, weeklyStudentId, body) {
    if (!Number.isSafeInteger(weeklyStudentId) || weeklyStudentId < 1) {
      throw serviceError("El identificador del alumno no es válido");
    }
    if (!body || typeof body.weekStart !== "string") {
      throw serviceError("Indica la semana de la tutoría");
    }
    parseWeekStart(body.weekStart);
    const weekStart = parseWeekStart(body.weekStart);
    await repository.scheduleStudent(tutorId, weeklyStudentId, parseSlot(body), weekStart);
    return { weeklyStudentId, ...parseSlot(body) };
  }

  async function updateSessionStatus(tutorId, sessionId, body) {
    if (!Number.isSafeInteger(sessionId) || sessionId < 1) {
      throw serviceError("El identificador de tutoría no es válido");
    }
    if (!["completed", "cancelled"].includes(body?.status)) {
      throw serviceError("El estado debe ser completed o cancelled");
    }
    await repository.updateSessionStatus(tutorId, sessionId, body.status);
    return { sessionId, status: body.status };
  }

  async function createRequest(studentId, body) {
    let dto;
    try {
      dto = TutorRequestDto.from(body);
    } catch (error) {
      throw serviceError(error.message);
    }
    const entity = TutorRequest.fromDto(dto, studentId);
    if (!Number.isSafeInteger(entity.tutorId) || entity.tutorId < 1 ||
        !entity.subject || entity.subject.length > 120 ||
        !entity.topic || entity.topic.length > 500) {
      throw serviceError("Selecciona un tutor, una materia y describe el tema (máximo 500 caracteres)");
    }
    if (!["matutino", "vespertino", "nocturno"].includes(entity.schoolShift)) {
      throw serviceError("Selecciona un turno escolar válido");
    }
    entity.weekStart = parseWeekStart(entity.weekStart);
    if ((entity.preferredWeekday === null) !== (entity.preferredStartHour === null)) {
      throw serviceError("Selecciona ambos datos del horario preferido o déjalos vacíos");
    }
    if (entity.preferredWeekday !== null) {
      parseSlot({ weekday: entity.preferredWeekday, startHour: entity.preferredStartHour });
    }
    const requestId = await repository.createRequest(entity);
    return { requestId, ...entity };
  }

  return { createRequest, decideRequest, getWeek, saveAvailability, scheduleStudent, updateSessionStatus };
}

module.exports = {
  createTutorManagementService,
  MAX_WEEKLY_STUDENTS,
  parseSlot,
  parseWeekStart,
};
