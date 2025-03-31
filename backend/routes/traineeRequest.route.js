import express from 'express';
import {rejectTrainerRequest,acceptTrainerRequest,showConnectedTrainers,showRequest,removeTrainerFromTrainee} from '../controllers/traineeRequest.controller.js';
import verifyJWT from '../middlewares/authTrainee.middleware.js';
// import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get("/connected-trainers",verifyJWT,showConnectedTrainers);
// User accepts trainer request
router.post('/reject',verifyJWT,rejectTrainerRequest);

// User rejects trainer request
router.post('/accept',verifyJWT, acceptTrainerRequest);

router.get("/show-request",verifyJWT,showRequest);

router.post("/remove-trainer",verifyJWT,removeTrainerFromTrainee);



// router.get("/show-request",)

export default router;