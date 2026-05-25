import express from "express";

import {
  getAllProjectTemplates,
  getProjectTemplateById,
  createProjectTemplate,
  updateProjectTemplate,
  deleteProjectTemplate,
} from "../controllers/projectTemplateController.js";

import validate from "../middleware/validate.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

import {
  createProjectTemplateDto,
  updateProjectTemplateDto,
} from "../dtos/projectTemplate.dto.js";

const router = express.Router();

router.get("/", protect, getAllProjectTemplates);
router.get("/:id", protect, getProjectTemplateById);

router.post(
  "/",
  protect,
  allowRoles("admin"),
  validate(createProjectTemplateDto),
  createProjectTemplate
);

router.put(
  "/:id",
  protect,
  allowRoles("admin"),
  validate(updateProjectTemplateDto),
  updateProjectTemplate
);

router.delete(
  "/:id",
  protect,
  allowRoles("admin"),
  deleteProjectTemplate
);

export default router;