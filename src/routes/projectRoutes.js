import express from "express";

import {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";

import validate from "../middleware/validate.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

import { createProjectDto, updateProjectDto } from "../dtos/project.dto.js";

const router = express.Router();

router.get("/", protect, getAllProjects);
router.get("/:id", protect, getProjectById);

router.post(
  "/",
  protect,
  allowRoles("admin"),
  validate(createProjectDto),
  createProject
);

router.put(
  "/:id",
  protect,
  allowRoles("admin"),
  validate(updateProjectDto),
  updateProject
);

router.delete("/:id", protect, allowRoles("admin"), deleteProject);

export default router;