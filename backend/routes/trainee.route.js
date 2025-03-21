import { Router } from "express";
import { 
  loginTrainee, 
  logoutTrainee, 
  registerTrainee, 
  refreshAccessToken, 
  getLoggedInTraineeDetails, 
} from "../controllers/trainee.controller.js";
import verifyJWT from "../middlewares/authTrainee.middleware.js";


const router = Router()

router.route("/register").post(registerTrainee);

router.route("/login").post(loginTrainee)
//secured routes
router.route("/logout").post(verifyJWT,  logoutTrainee)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/profile").get(verifyJWT, getLoggedInTraineeDetails)

export default router
