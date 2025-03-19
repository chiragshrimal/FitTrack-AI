import { Router } from "express";
import {
  getLoggedInTrainerDetails,
  loginTrainer,
  logoutTrainer,
  registerTrainer
} from "../controllers/trainer.controller.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register",registerTrainer);
router.post("/login", loginTrainer);
router.post("/logout", logoutTrainer);
router.get("/profile", isLoggedIn, getLoggedInTrainerDetails);

export default router;