import express from "express";

import {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "../controllers/authController.js";

import validate from "../middleware/validate.js";

import {
  registerDto,
  loginDto,
  forgotPasswordDto,
  verifyOtpDto,
  resetPasswordDto,
} from "../dtos/auth.dto.js";

import { protect } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/register", validate(registerDto), register);
router.post("/login", validate(loginDto), login);
router.get("/me", protect, getMe);

router.post("/forgot-password", validate(forgotPasswordDto), forgotPassword);
router.post("/verify-otp", validate(verifyOtpDto), verifyOtp);
router.post("/reset-password", validate(resetPasswordDto), resetPassword);

// Temporary test route. Delete later if not needed.
router.get("/admin-test", protect, allowRoles("admin"), (req, res) => {
  res.json({
    message: "Welcome Admin",
    user: req.user,
  });
});

export default router;