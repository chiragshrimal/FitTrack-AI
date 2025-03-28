import express from 'express';
import { sendTrainerRequest ,checkTrainee,showConnectedTrainee,removeTraineeByTrainer} from '../controllers/trainerRequest.contoller.js';
import verifyJWT from '../middlewares/authTrainer.middleware.js';
// import { protect, authorize } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Trainer can send requests to users without a trainer
router.post("/search-trainee",verifyJWT,checkTrainee);
router.post('/send',verifyJWT,sendTrainerRequest);
router.post("/remove-trainee",verifyJWT,removeTraineeByTrainer);
router.get("/connected-trainees",verifyJWT,showConnectedTrainee);

export default router;