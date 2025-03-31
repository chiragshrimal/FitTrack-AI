import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/appError.js';
import mongoose from 'mongoose';
import PushUp from "../models/pushup.mode.js";
import User from "../models/trainee.model.js";

/**
 * @ACCEPT_TRAINER_REQUEST
 * @ROUTE @POST /api/user/request/accept
 * @ACCESS Private (User only)
 */


export const postWorkoutRecord = asyncHandler(async (req, res, next) => {
    const {exercise, count, startTime, stopTime} = req.body;
    const userId = req.user.id; // Extract trainee ID from authenticated request

      // Validate if userId exists
      if (!userId) {
        return next(new AppError('User ID is required', 400));
      }

      if(!exercise || !count || !startTime || !stopTime){
        return next(new AppError('Invalid Inputs'), 400);
      }

      try{

        const userObjectId = new mongoose.Types.ObjectId(userId);

        const user = await User.findOne({ _id: userObjectId });

        // Convert startTime and stopTime to Date objects and calculate duration
        const start = new Date(startTime);
        const stop = new Date(stopTime);
        const duration = (stop - start) / (1000 * 60); // Converts to minutes

        const createRecord = await PushUp.create({
            name: exercise,
            count: count,
            duration: duration,
            date: Date.now(),
            user: user._id
          });

          try {
            await createRecord.save();
          } catch (err) {
            return next(new AppError("creating record failed, try again later", 500));
          }
        
          // Return the course created
          res.status(201).json({ record: createRecord });
 

      } catch(err){
        return next(new AppError(err.message, 500));
      }
});