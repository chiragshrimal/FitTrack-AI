import { Router } from "express";
import { 
  loginTrainer, 
  logoutTrainer, 
  registerTrainer, 
  refreshAccessToken, 
  getLoggedInTrainerDetails, 
} from "../controllers/trainer.controller.js";
import verifyJWT from "../middlewares/authTrainer.middleware.js";


const router = Router();

router.route("/register").post(registerTrainer);

router.route("/login").post(loginTrainer)
//secured routes
router.route("/logout").post(verifyJWT,  logoutTrainer)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/profile").get(verifyJWT, getLoggedInTrainerDetails)

export default router
