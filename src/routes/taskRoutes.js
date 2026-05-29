import express from "express";

import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
} from "../controllers/taskController.js";

import validate from "../middleware/validate.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

import {
  createTaskDto,
  updateTaskDto,
  updateTaskStatusDto,
} from "../dtos/task.dto.js";

const router = express.Router();

router.get("/", protect, allowRoles("admin", "employee"), getAllTasks);
router.get("/:id", protect, allowRoles("admin", "employee"), getTaskById);

router.post("/", protect, allowRoles("admin"), validate(createTaskDto), createTask);

router.put("/:id", protect, allowRoles("admin"), validate(updateTaskDto), updateTask);

router.patch(
  "/:id/status",
  protect,
  allowRoles("admin", "employee"),
  validate(updateTaskStatusDto),
  updateTaskStatus
);

router.delete("/:id", protect, allowRoles("admin"), deleteTask);

export default router;