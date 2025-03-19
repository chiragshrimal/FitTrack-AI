import { Router } from "express";
import {
  registerTrainee, loginTrainee, logoutTrainee, getLoggedInTraineeDetails
} from "../controllers/trainee.controller.js";
import { isLoggedIn } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register",registerTrainee);
router.post("/login", loginTrainee);
router.post("/logout",isLoggedIn, logoutTrainee);
router.get("/profile", isLoggedIn, getLoggedInTraineeDetails);

export default router;
