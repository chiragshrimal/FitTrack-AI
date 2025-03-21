import express from 'express';
import {rejectTrainerRequest,acceptTrainerRequest} from '../controllers/traineeRequest.controller.js';
import verifyJWT from '../middlewares/authTrainee.middleware.js';
// import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// User accepts trainer request
router.post('/reject',verifyJWT,rejectTrainerRequest);

// User rejects trainer request
router.post('/accept',verifyJWT, acceptTrainerRequest);

export default router;