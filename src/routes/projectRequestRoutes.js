import express from "express";

import {
  getAllProjectRequests,
  getProjectRequestById,
  createProjectRequest,
  approveProjectRequest,
  rejectProjectRequest,
  deleteProjectRequest,
} from "../controllers/projectRequestController.js";

import validate from "../middleware/validate.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

import {
  createProjectRequestDto,
  rejectProjectRequestDto,
} from "../dtos/projectRequest.dto.js";

const router = express.Router();

router.get("/", protect, allowRoles("admin", "client"), getAllProjectRequests);

router.get(
  "/:id",
  protect,
  allowRoles("admin", "client"),
  getProjectRequestById
);

router.post(
  "/",
  protect,
  allowRoles("client"),
  validate(createProjectRequestDto),
  createProjectRequest
);

router.patch(
  "/:id/approve",
  protect,
  allowRoles("admin"),
  approveProjectRequest
);

router.patch(
  "/:id/reject",
  protect,
  allowRoles("admin"),
  validate(rejectProjectRequestDto),
  rejectProjectRequest
);

router.delete(
  "/:id",
  protect,
  allowRoles("admin", "client"),
  deleteProjectRequest
);

export default router;