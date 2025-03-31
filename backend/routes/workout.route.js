import express from 'express';
// import {rejectTrainerRequest,acceptTrainerRequest,showConnectedTrainers,showRequest,removeTrainerFromTrainee} from '../controllers/traineeRequest.controller.js';
import { postWorkoutRecord } from "../controllers/workout.controller.js";
import verifyJWT from '../middlewares/authTrainee.middleware.js';

const router = express.Router();

router.post("/",verifyJWT, postWorkoutRecord);

export default router;