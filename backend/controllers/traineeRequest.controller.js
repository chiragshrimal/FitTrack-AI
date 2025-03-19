import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/AppError.js';
import User from '../models/trainee.model.js';
import Request from '../models/request.model.js';
import Group from '../models/group.model.js';
import mongoose from 'mongoose';

/**
 * @ACCEPT_TRAINER_REQUEST
 * @ROUTE @POST /api/user/request/accept
 * @ACCESS Private (User only)
 */
export const acceptTrainerRequest = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  console.log(userId);
  const { trainerId } = req.body;
  console.log(trainerId);

  // Validate trainer ID
  if (!trainerId) {
    return next(new AppError('Trainer ID is required', 400));
  }

  // Convert IDs to ObjectId
  const trainerObjectId = new mongoose.Types.ObjectId(trainerId);
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Find the request from the trainer to this user
  const request = await Request.findOne({
    from: trainerObjectId,
    to: userObjectId
  });

  if (!request) {
    return next(new AppError('No request found from this trainer', 404));
  }
  try {
    // Remove the user from the request's `to` array
  await Request.updateOne(
    { from: trainerObjectId },
    { $pull: { to: userObjectId } }
  );

  // If request is empty after removal, delete it
  const updatedRequest = await Request.findOne({ from: trainerObjectId });
  if (!updatedRequest || updatedRequest.to.length === 0) {
    await Request.deleteOne({ from: trainerObjectId });
  }

  // Assign trainer to user (prevent duplicates)
  const user = await User.findById(userId);
  if (!user.trainer.includes(trainerObjectId)) {
    user.trainer.push(trainerObjectId);
    await user.save();
  }

  // Add user to trainer's group
  let group = await Group.findOne({ head: trainerObjectId });

  if (!group) {
    group = await Group.create({ head: trainerObjectId, members: [userObjectId] });
  } else {
    if (!group.members.includes(userObjectId)) {
      group.members.push(userObjectId);
      await group.save();
    }
  }

  res.status(200).json({
    success: true,
    message: 'Trainer request accepted successfully.',
  });

  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});
/**
 * @REJECT_TRAINER_REQUEST
 * @ROUTE @POST /api/user/request/reject
 * @ACCESS Private (User only)
 */
export const rejectTrainerRequest = asyncHandler(async (req, res, next) => {
    const userId = req.user.id;
    const { trainerId } = req.body;
  
    // Validate trainer ID
    if (!trainerId) {
      return next(new AppError('Trainer ID is required', 400));
    }
  
    // Find and remove user from the request list
    const request = await Request.findOneAndUpdate(
      { from: trainerId },
      { $pull: { to: userId } },
      { new: true }
    );
  
    if (!request) {
      return next(new AppError('No request found from this trainer', 404));
    }
    try {
      // If no more users in the request list, delete the request document
    if (request.to.length === 0) {
      await Request.deleteOne({ from: trainerId });
    }
  
    res.status(200).json({
      success: true,
      message: 'Trainer request rejected successfully.',
    });
    } catch (error) {
      return next(new AppError(error.message, 500));
    }
  });

export default {rejectTrainerRequest,acceptTrainerRequest};