import express from 'express';
import { sendTrainerRequest } from '../controllers/trainerRequest.contoller.js';
import { isLoggedIn } from '../middlewares/auth.middleware.js';
// import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Trainer can send requests to users without a trainer
router.post('/',isLoggedIn,sendTrainerRequest);

export default router;