import jwt from "jsonwebtoken";
import db from "../config/db.js";

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized, token is missing",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await db.query(
      "SELECT user_id, name, email, role, created_at FROM users WHERE user_id = ?",
      [decoded.user_id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Not authorized, user not found",
      });
    }

    req.user = users[0];

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    return res.status(401).json({
      message: "Not authorized, invalid token",
    });
  }
};

export { protect };