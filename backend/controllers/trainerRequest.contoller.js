import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/appError.js';
import User from '../models/trainee.model.js';
import Request from '../models/request.model.js';
import Trainer from '../models/trainer.model.js';
import Group from "../models/group.model.js";

/**
 * @SEND_TRAINER_REQUEST
 * @ROUTE @POST /api/trainer/send-request
 * @ACCESS Private (Trainer only)
 */

export const checkTrainee=asyncHandler(async(req,res,next)=>{
  // const trainerId = req.user.id; // Get trainer ID from auth middleware
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
  return res.status(200).json({
    success: true,
    message : "Trainee exists",
    trainee
  })

  } catch (error) {
    return next(new AppError(error.message,500));
  }
});
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

    // Check if the trainee already has the trainer assigned
    if (trainee.trainer.includes(trainerId)) {
      return next(new AppError('You are already assigned as the trainer for this trainee.', 410));
    }

    // Check if a request already exists for this trainer
    let request = await Request.findOne({ from: trainerId });

    if (request) {
      // If the trainee is already in the request list, prevent duplicate entries
      if (request.to.includes(trainee._id)) {
        return next(new AppError('You have already sent a request to this trainee.', 411));
      }

      // Add the new trainee to the existing request
      request.to.push(trainee._id);
      await request.save();
    } else {
      // Create a new request with this trainer and trainee
      request = await Request.create({ from: trainerId, to: [trainee._id] });
    }

    res.status(201).json({
      success: true,
      message: `Request sent to ${username}.`,
      trainee,
    });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

export const showConnectedTrainee = asyncHandler(async (req, res, next) => {
  try {
    const trainerId = req.user.id;

    if (!trainerId) {
      return next(new AppError('Please provide trainerId', 400));
    }

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return next(new AppError('Invalid trainer', 400));
    }

    // Fetch group where trainer is the head
    const group = await Group.findOne({ head: trainerId }).populate('members');
    
    if (!group) {
      return next(new AppError('No trainees found for this trainer', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Successfully found trainees',
      trainees: group.members, // Returning populated members (trainees)
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

export const removeTraineeByTrainer = asyncHandler(async (req, res, next) => {
  try {
    const trainerId = req.user.id;
    const { username } = req.body;

    if (!trainerId) {
      return next(new AppError('Please provide trainerId', 400));
    }
    if (!username) {
      return next(new AppError('Please provide username', 400));
    }

    const trainee = await User.findOne({ username });
    if (!trainee) {
      return next(new AppError('Invalid trainee', 400));
    }

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return next(new AppError('Invalid trainer', 400));
    }

    // Remove trainee from the trainer's group
    const group = await Group.findOneAndUpdate(
      { head: trainerId },
      { $pull: { members: trainee._id } },
      { new: true }
    );

    if (!group) {
      return next(new AppError("Trainee not found in this trainer's group", 404));
    }

    // Remove trainer from trainee's list of trainers
    await User.findByIdAndUpdate(
      trainee._id,
      { $pull: { trainer: trainerId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Trainee successfully removed from the trainer's group",
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});


export default { sendTrainerRequest ,checkTrainee,showConnectedTrainee,removeTraineeByTrainer};
