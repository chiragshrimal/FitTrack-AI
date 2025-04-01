import express from 'express';
// import {rejectTrainerRequest,acceptTrainerRequest,showConnectedTrainers,showRequest,removeTrainerFromTrainee} from '../controllers/traineeRequest.controller.js';
import { fetchWorkoutByRecord, fetchWorkoutByDay } from "../controllers/workout.controller.js";
import verifyJWT from '../middlewares/authTrainer.middleware.js';

const router = express.Router();

router.get("/record", verifyJWT, fetchWorkoutByRecord);

router.get("/day", verifyJWT, fetchWorkoutByDay);
// router.get("/day", );

export default router;