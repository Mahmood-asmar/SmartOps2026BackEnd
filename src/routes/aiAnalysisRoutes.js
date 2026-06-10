import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  analyzeProject,
  getLatestProjectAnalysis,
  getMyAiAnalyses,
} from "../controllers/aiAnalysisController.js";

const router = express.Router();

router.use(protect);

// Generate new AI analysis for a specific project
router.post("/project/:projectId", analyzeProject);

// Get latest AI analysis for a specific project
router.get("/project/:projectId", getLatestProjectAnalysis);

// Get AI analyses list depending on user role
router.get("/", getMyAiAnalyses);

export default router;