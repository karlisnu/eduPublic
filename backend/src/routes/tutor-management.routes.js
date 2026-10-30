const express = require("express");
const { createTutorManagementRepository } = require("../repositories/tutor-management.repository");
const { createTutorManagementService } = require("../services/tutor-management.service");

function createTutorManagementRouter({ pool, requireAuthentication, requireRoles }) {
  const router = express.Router();
  const service = createTutorManagementService(createTutorManagementRepository(pool));
  const tutorOnly = [requireAuthentication, requireRoles("tutor")];

  router.get("/week", ...tutorOnly, async (req, res, next) => {
    try {
      res.json(await service.getWeek(req.auth.id, req.query.weekStart));
    } catch (error) {
      next(error);
    }
  });

  router.get("/tutors/:id/availability", requireAuthentication, requireRoles("alumno"), async (req, res, next) => {
    try {
      res.json(await service.getStudentAvailability(
        Number(req.params.id),
        req.query.weekStart,
      ));
    } catch (error) {
      next(error);
    }
  });

  router.put("/availability", ...tutorOnly, async (req, res, next) => {
    try {
      res.json(await service.saveAvailability(req.auth.id, req.body));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/requests/:id", ...tutorOnly, async (req, res, next) => {
    try {
      res.json(await service.decideRequest(req.auth.id, Number(req.params.id), req.body));
    } catch (error) {
      next(error);
    }
  });

  router.put("/students/:id/schedule", ...tutorOnly, async (req, res, next) => {
    try {
      res.json(await service.scheduleStudent(req.auth.id, Number(req.params.id), req.body));
    } catch (error) {
      next(error);
    }
  });

  router.patch("/sessions/:id/status", ...tutorOnly, async (req, res, next) => {
    try {
      res.json(await service.updateSessionStatus(req.auth.id, Number(req.params.id), req.body));
    } catch (error) {
      next(error);
    }
  });

  router.post("/requests", requireAuthentication, requireRoles("alumno"), async (req, res, next) => {
    try {
      const result = await service.createRequest(req.auth.id, req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createTutorManagementRouter };
