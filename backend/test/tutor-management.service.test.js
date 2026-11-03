const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createTutorManagementService,
  parseSlot,
  parseWeekStart,
} = require("../src/services/tutor-management.service");

test("week selection only accepts a Monday calendar date", () => {
  assert.equal(parseWeekStart("2026-10-19"), "2026-10-19");
  assert.throws(() => parseWeekStart("2026-10-20"), /lunes/);
  assert.throws(() => parseWeekStart("2026-02-30"), /fecha válida/);
});

test("availability accepts only weekdays and hourly blocks from 7 through 19", () => {
  assert.deepEqual(parseSlot({ weekday: 5, startHour: 19 }), { weekday: 5, startHour: 19 });
  assert.throws(() => parseSlot({ weekday: 6, startHour: 19 }), /lunes y viernes/);
  assert.throws(() => parseSlot({ weekday: 1, startHour: 20 }), /lunes y viernes/);
});

test("students can request only valid-week availability for a tutor", async () => {
  let queried;
  const service = createTutorManagementService({
    getStudentAvailability: async (tutorId, weekStart) => {
      queried = { tutorId, weekStart };
      return [{ weekday: 2, startHour: 16 }];
    },
  });
  assert.deepEqual(await service.getStudentAvailability(7, "2026-10-19"), {
    tutorId: 7,
    weekStart: "2026-10-19",
    slots: [{ weekday: 2, startHour: 16 }],
  });
  assert.deepEqual(queried, { tutorId: 7, weekStart: "2026-10-19" });
  await assert.rejects(service.getStudentAvailability(0, "2026-10-19"), /identificador/);
  await assert.rejects(service.getStudentAvailability(7, "2026-10-20"), /lunes/);
});

test("service enforces the weekly cap and compatible availability before accepting", async () => {
  let validate;
  const repository = {
    decideRequest: async (_tutorId, _requestId, _decision, validator) => {
      validate = validator;
      return { studentId: 9 };
    },
  };
  const service = createTutorManagementService(repository);
  await service.decideRequest(4, 12, { decision: "accepted" });
  assert.throws(
    () => validate({
      acceptedStudentExists: false,
      acceptedStudentCount: 15,
      hasCompatibleAvailability: true,
    }),
    (error) => error.status === 409 && /15 alumnos/.test(error.message),
  );
  assert.throws(
    () => validate({
      acceptedStudentExists: false,
      acceptedStudentCount: 14,
      hasCompatibleAvailability: false,
    }),
    (error) => error.status === 409 && /compatible/.test(error.message),
  );
});

test("student request DTO is converted into a normalized request entity before storage", async () => {
  let storedEntity;
  const repository = {
    createRequest: async (entity) => {
      storedEntity = entity;
      return 88;
    },
  };
  const service = createTutorManagementService(repository);
  const result = await service.createRequest(23, {
    tutorId: "7",
    subject: "  Álgebra  ",
    topic: "  Ecuaciones lineales  ",
    schoolShift: "vespertino",
    weekStart: "2026-10-19",
    preferredWeekday: "2",
    preferredStartHour: "16",
  });
  assert.equal(storedEntity.tutorId, 7);
  assert.equal(storedEntity.studentId, 23);
  assert.equal(storedEntity.subject, "Álgebra");
  assert.equal(storedEntity.topic, "Ecuaciones lineales");
  assert.equal(result.requestId, 88);
  await assert.rejects(
    service.createRequest(23, {
      tutorId: 7,
      subject: "Álgebra",
      topic: "Tema",
      schoolShift: "vespertino",
      weekStart: "2026-10-19",
      preferredWeekday: 2,
      preferredStartHour: null,
    }),
    /ambos datos/,
  );
});
