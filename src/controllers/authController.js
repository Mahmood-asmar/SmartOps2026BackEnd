import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import db from "../config/db.js";
import sendEmail from "../utils/sendEmail.js";

const generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const cleanName = name.trim();
    const cleanEmail = email.toLowerCase().trim();

    const [existingUser] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [cleanEmail]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const allowedRoles = ["admin", "employee", "client"];
    const userRole = allowedRoles.includes(role) ? role : "client";

    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
      [cleanName, cleanEmail, hashedPassword, userRole]
    );

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        user_id: result.insertId,
        name: cleanName,
        email: cleanEmail,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Register failed",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = email.toLowerCase().trim();

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      cleanEmail,
    ]);

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

const getMe = async (req, res) => {
  return res.json({
    message: "User data fetched successfully",
    user: req.user,
  });
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      cleanEmail,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        message: "User with this email does not exist",
      });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(
      `UPDATE users
       SET reset_otp = ?,
           reset_otp_expires = ?,
           is_otp_verified = FALSE
       WHERE email = ?`,
      [otp, otpExpires, cleanEmail]
    );

    await sendEmail({
      to: cleanEmail,
      subject: "SmartOps Password Reset OTP",
      text: `Your SmartOps password reset OTP is: ${otp}. This OTP will expire in 10 minutes.`,
    });

    return res.json({
      message: "OTP sent to your email successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      message: "Forgot password failed",
      error: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      cleanEmail,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        message: "User with this email does not exist",
      });
    }

    const user = users[0];

    if (!user.reset_otp || !user.reset_otp_expires) {
      return res.status(400).json({
        message: "No OTP request found. Please request a new OTP",
      });
    }

    if (user.reset_otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP",
      });
    }

    const now = new Date();
    const otpExpires = new Date(user.reset_otp_expires);

    if (now > otpExpires) {
      return res.status(400).json({
        message: "OTP has expired. Please request a new OTP",
      });
    }

    await db.query(
      `UPDATE users
       SET is_otp_verified = TRUE
       WHERE email = ?`,
      [cleanEmail]
    );

    return res.json({
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return res.status(500).json({
      message: "OTP verification failed",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      cleanEmail,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        message: "User with this email does not exist",
      });
    }

    const user = users[0];

    if (!user.is_otp_verified) {
      return res.status(400).json({
        message: "OTP is not verified",
      });
    }

    const now = new Date();
    const otpExpires = new Date(user.reset_otp_expires);

    if (!user.reset_otp_expires || now > otpExpires) {
      return res.status(400).json({
        message: "OTP has expired. Please request a new OTP",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      `UPDATE users
       SET password = ?,
           reset_otp = NULL,
           reset_otp_expires = NULL,
           is_otp_verified = FALSE
       WHERE email = ?`,
      [hashedPassword, cleanEmail]
    );

    return res.json({
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      message: "Reset password failed",
      error: error.message,
    });
  }
};

export {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOtp,
  resetPassword,
};