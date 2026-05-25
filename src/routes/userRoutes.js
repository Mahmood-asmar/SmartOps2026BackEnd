import express from "express";

import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";

import validate from "../middleware/validate.js";
import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

import { createUserDto, updateUserDto } from "../dtos/user.dto.js";

const router = express.Router();

router.use(protect);
router.use(allowRoles("admin"));

router.get("/", getAllUsers);
router.get("/:id", getUserById);
router.post("/", validate(createUserDto), createUser);
router.put("/:id", validate(updateUserDto), updateUser);
router.delete("/:id", deleteUser);

export default router;