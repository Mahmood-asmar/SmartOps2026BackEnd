import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import projectTemplateRoutes from "./routes/projectTemplateRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import projectRequestRoutes from "./routes/projectRequestRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";

import setupSocket from "./socket.js";
import aiAnalysisRoutes from "./routes/aiAnalysisRoutes.js";


dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

setupSocket(io);

app.set("io", io);

app.get("/", (req, res) => {
  res.send("Backend is running...");
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/project-templates", projectTemplateRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/project-requests", projectRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/ai-analysis", aiAnalysisRoutes);


const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});