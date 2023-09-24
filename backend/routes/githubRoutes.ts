import express from "express";
import { getAllTeamData } from "../controllers/githubController";

const router = express.Router();

router.get('/', getAllTeamData);

export default router;