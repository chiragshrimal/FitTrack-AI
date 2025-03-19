import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/AppError.js';
import User from '../models/trainee.model.js';
import Request from '../models/request.model.js';
import Trainer from '../models/trainer.model.js'; // Assuming there's a Trainer model

/**
 * @SEND_TRAINER_REQUEST
 * @ROUTE @POST /api/trainer/request
 * @ACCESS Private (Trainer only)
 */
export const sendTrainerRequest = asyncHandler(async (req, res, next) => {
  const trainerId = req.user.id; // Get trainer ID from auth middleware
  
  // Find users who do not have a trainer
  const unassignedUsers = await User.find({ trainer: { $size: 0 } });

  if (unassignedUsers.length === 0) {
    return next(new AppError('No available users to send requests.', 400));
  }

  // Extract user IDs
  const userIds = unassignedUsers.map(user => user._id);

  // Check if a request already exists
  const existingRequest = await Request.findOne({ from: trainerId });
  if (existingRequest) {
    return next(new AppError('You have already sent requests to users.', 400));
  }

  // Create a request
  const request = await Request.create({ from: trainerId, to: userIds });

  // Fetch trainer details
  const trainer = await Trainer.findById(trainerId).select("-password"); // Exclude password field

  res.status(201).json({
    success: true,
    message: 'Request sent to all unassigned users.',
    trainer,
    users: unassignedUsers, // Send the users data along with the response
  });
});

export default { sendTrainerRequest };
