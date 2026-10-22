class TutorRequest {
  constructor({ tutorId, studentId, subject, topic, schoolShift, weekStart, preferredWeekday, preferredStartHour }) {
    this.tutorId = tutorId;
    this.studentId = studentId;
    this.subject = subject;
    this.topic = topic;
    this.schoolShift = schoolShift;
    this.weekStart = weekStart;
    this.preferredWeekday = preferredWeekday;
    this.preferredStartHour = preferredStartHour;
  }

  static fromDto(dto, studentId) {
    return new TutorRequest({
      tutorId: Number(dto.tutorId),
      studentId,
      subject: typeof dto.subject === "string" ? dto.subject.trim() : "",
      topic: typeof dto.topic === "string" ? dto.topic.trim() : "",
      schoolShift: dto.schoolShift,
      weekStart: dto.weekStart,
      preferredWeekday: dto.preferredWeekday === null || dto.preferredWeekday === undefined
        ? null
        : Number(dto.preferredWeekday),
      preferredStartHour: dto.preferredStartHour === null || dto.preferredStartHour === undefined
        ? null
        : Number(dto.preferredStartHour),
    });
  }
}

module.exports = { TutorRequest };
