import express from 'express';
import {rejectTrainerRequest,acceptTrainerRequest} from '../controllers/traineeRequest.controller.js';
import { isLoggedIn } from '../middlewares/auth.middleware.js';
// import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// User accepts trainer request
router.post('/reject',isLoggedIn,rejectTrainerRequest);

// User rejects trainer request
router.post('/accept',isLoggedIn, acceptTrainerRequest);

export default router;