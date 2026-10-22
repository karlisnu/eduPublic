class TutorRequestDto {
  static from(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("La solicitud debe ser un objeto válido");
    }
    return {
      tutorId: body.tutorId,
      subject: body.subject,
      topic: body.topic,
      schoolShift: body.schoolShift,
      weekStart: body.weekStart,
      preferredWeekday: body.preferredWeekday,
      preferredStartHour: body.preferredStartHour,
    };
  }
}

module.exports = { TutorRequestDto };
