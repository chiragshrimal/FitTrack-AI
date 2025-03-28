import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/appError.js';
import User from '../models/trainee.model.js';
import Request from '../models/request.model.js';
import Group from '../models/group.model.js';
import mongoose from 'mongoose';
import Trainer from '../models/trainer.model.js'; // Import Trainer model

/**
 * @ACCEPT_TRAINER_REQUEST
 * @ROUTE @POST /api/user/request/accept
 * @ACCESS Private (User only)
 */

export const showRequest = asyncHandler(async (req, res, next) => {
  const userId = req.user.id; // Extract trainee ID from authenticated request

  // Validate if userId exists
  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  try {
    console.log("User ID:", userId);

    // Ensure userId is converted to ObjectId for querying
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Find all requests where the logged-in user is in the "to" field
    const requests = await Request.find({ to: userObjectId })
      .populate('from', 'name username email'); // Populate trainer details only

    console.log("Requests Data:", requests);

    // If no requests exist, return an error
    if (!requests || requests.length === 0) {
      return next(new AppError('No trainer requests found for this trainee.', 404));
    }

    // Extract the list of trainers
    const trainers = requests.map(request => request.from);

    // Send success response with only trainers
    res.status(200).json({
      success: true,
      message: 'Trainer requests fetched successfully.',
      trainers, // Only list of trainers is returned
    });

  } catch (error) {
    console.error("Error in showRequest:", error);
    return next(new AppError(error.message, 500));
  }
});

export const showConnectedTrainers = asyncHandler(async (req, res, next) => {
  // console.log(req);
  const userId = req.user.id; // Extract authenticated user ID
  // console.log(`Authenticated User ID: ${userId}`);
  // console.log(userId);

  if (!userId) {
    return next(new AppError('userId is required', 400));
  }

  try {
    // 🔹 Find the trainee and populate the trainer field to get trainer details (excluding password & refresh token)
    const trainee = await User.findById(userId).populate('trainer', 'username name email gender');

    if (!trainee) {
      return next(new AppError('Trainee not found', 404));
    }

    // Send response with connected trainers
    res.status(200).json({
      success: true,
      message: 'Successfully fetched trainers',
      trainers: trainee.trainer.length > 0 ? trainee.trainer : [],
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});




export const acceptTrainerRequest = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { username } = req.body; // Receive trainer's username instead of ID
  console.log(username);

  // Validate trainer username
  if (!username) {
    return next(new AppError('Trainer username is required', 400));
  }

  // Find the trainer in the Trainer collection using username
  const trainer = await Trainer.findOne({ username });

  if (!trainer) {
    return next(new AppError('Trainer not found', 404));
  }

  // Get trainer's ID from the found trainer
  const trainerObjectId = trainer._id;
  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Check if the trainer is already assigned to the trainee
  const user = await User.findById(userId);

  if (user.trainer.includes(trainerObjectId)) {
    return next(new AppError('Trainer is already assigned to this trainee', 400));
  }

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

    // Assign trainer to user (since we already checked it's not a duplicate)
    user.trainer.push(trainerObjectId);
    await user.save();

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

/**
 * @REJECT_TRAINER_REQUEST
 * @ROUTE @POST /api/user/request/reject
 * @ACCESS Private (User only)
 */
export const rejectTrainerRequest = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { username } = req.body; // Receive trainer's username instead of ID

  // Validate trainer username
  if (!username) {
    return next(new AppError('Trainer username is required', 400));
  }

  // Find the trainer in the Trainer collection using username
  const trainer = await Trainer.findOne({ username });

  if (!trainer) {
    return next(new AppError('Trainer not found', 404));
  }

  // Get trainer's ID from the found trainer
  const trainerObjectId = trainer._id;
  const userObjectId = userId;

  try {
    // Find the request document
    let request = await Request.findOne({ from: trainerObjectId });

    if (!request) {
      return next(new AppError('No request found from this trainer', 404));
    }

    // Remove the user from the request's `to` array
    request.to = request.to.filter(id => !id.equals(userObjectId));
    await request.save(); // Save the updated request document

    // If no more users left in "to", delete the request document
    if (request.to.length === 0) {
      await Request.deleteOne({ _id: request._id });
    }

    res.status(200).json({
      success: true,
      message: 'Trainer request rejected successfully.',
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

export const removeTrainerFromTrainee = asyncHandler(async function (req, res, next) {
  try {
    const traineeId = req.user.id;
  if (!traineeId) {
    return next(new AppError('Trainee ID is required', 400));
  }

  const trainee = await User.findById(traineeId);
  if (!trainee) {
    return next(new AppError('Invalid trainee', 400));
  }

  const { username } = req.body;
  if (!username) {
    return next(new AppError('Please provide trainer username', 400));
  }

  const trainer = await Trainer.findOne({ username });
  if (!trainer) {
    return next(new AppError('Trainer not found', 404));
  }

  // Remove trainer from trainee's trainer list
  trainee.trainer = trainee.trainer.filter(id => id.toString() !== trainer._id.toString());
  await trainee.save();

  // Remove trainee from groups where the trainer is the head
  await Group.updateMany(
    { head: trainer._id },
    { $pull: { members: trainee._id } }
  );

  res.status(200).json({
    success: true,
    message: 'Trainer removed from trainee successfully',
  });
  } catch (error) {
    return next(new AppError(error.message,500));
  }
  
});

export default  {rejectTrainerRequest,acceptTrainerRequest,showConnectedTrainers,showRequest,removeTrainerFromTrainee};