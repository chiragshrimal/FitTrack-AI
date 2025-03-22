import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/appError.js';
import User from '../models/trainee.model.js';
import Request from '../models/request.model.js';
import Trainer from '../models/trainer.model.js';

/**
 * @SEND_TRAINER_REQUEST
 * @ROUTE @POST /api/trainer/send-request
 * @ACCESS Private (Trainer only)
 */
export const sendTrainerRequest = asyncHandler(async (req, res, next) => {
  const trainerId = req.user.id; // Get trainer ID from auth middleware
  const { username } = req.body; // Get trainee's username from request body

  if (!username) {
    return next(new AppError('Trainee username is required.', 400));
  }
  try {
    // Find the trainee by username
  const trainee = await User.findOne({ username }).select("-refereshToken");
  if (!trainee) {
    return next(new AppError('Trainee not found.', 404));
  }

  // Check if the trainee already has the trainer
  if (trainee.trainer.includes(trainerId)) {
    return next(new AppError('You are already assigned as the trainer for this trainee.', 410));
  }

  // Check if a request already exists from this trainer to this trainee
  const existingRequest = await Request.findOne({ from: trainerId, to: trainee._id });
  if (existingRequest) {
    return next(new AppError('You have already sent a request to this trainee.', 411));
  }

  // Create a request for the specific trainee
  const request = await Request.create({ from: trainerId, to: [trainee._id] });

  // Fetch trainer details
  const trainer = await Trainer.findById(trainerId); // Exclude password field

  trainee.password=undefined;

  res.status(201).json({
    success: true,
    message: `Request sent to ${username}.`,
    trainee,
  });
  } catch (error) {
    return next(new AppError(error.message,500));
  }
  
});

export default { sendTrainerRequest };
