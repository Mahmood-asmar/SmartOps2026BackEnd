import jwt from "jsonwebtoken";
import db from "./config/db.js";

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token;
      const queryToken = socket.handshake.query?.token;

      const headerToken = socket.handshake.headers?.authorization?.startsWith(
        "Bearer "
      )
        ? socket.handshake.headers.authorization.split(" ")[1]
        : null;

      const token = authToken || queryToken || headerToken;

      if (!token) {
        return next(new Error("Authentication error: token is missing"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const [users] = await db.query(
        "SELECT user_id, name, email, role FROM users WHERE user_id = ?",
        [decoded.user_id]
      );

      if (users.length === 0) {
        return next(new Error("Authentication error: user not found"));
      }

      socket.user = users[0];

      next();
    } catch (error) {
      return next(new Error("Authentication error: invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userRoom = `user_${socket.user.user_id}`;

    socket.join(userRoom);

    console.log(`Socket connected: ${socket.id}`);
    console.log(`User ${socket.user.user_id} joined ${userRoom}`);

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

export default setupSocket;