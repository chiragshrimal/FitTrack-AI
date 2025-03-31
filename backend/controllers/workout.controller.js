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

export const fetchWorkoutByRecord = asyncHandler(async (req, res, next) => {
    const { exercise, count } = req.query;

    // Validate input
    if (!exercise) {
        return next(new AppError("Exercise name is required", 400));
    }

    try {
        const records = await PushUp.find({ name: exercise })
            .sort({ date: -1 }) 
            .limit(count);

        if (!records || records.length === 0) {
            return next(new AppError("No records found for this exercise", 404));
        }

        const formattedRecords = records.map(record => ({
            ...record._doc, 
            date: new Date(record.date).toLocaleString("en-IN", { 
                timeZone: "Asia/Kolkata",  
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true  
            })
        }));

        res.status(200).json({ records: formattedRecords });

    } catch (err) {
        return next(new AppError(err.message, 500));
    }
});


export const fetchWorkoutByDay = asyncHandler(async (req, res, next) => {
    const { exercise, count } = req.query;

    // Validate input
    if (!exercise) {
        return next(new AppError("Exercise name is required", 400));
    }

    const daysCount = parseInt(count) || 7; // Default to last 7 days if count is not provided

    try {
        const today = new Date();
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - daysCount); // Get the date 'count' days ago

        const records = await PushUp.aggregate([
            {
                $match: { 
                    name: exercise, 
                    date: { $gte: pastDate } // Filter records from the last 'count' days
                }
            },
            {
                $group: {
                    _id: { 
                        $dateToString: { format: "%Y-%m-%d", date: "$date" } // Group by date (YYYY-MM-DD)
                    },
                    totalDuration: { $sum: "$duration" }, // Sum duration
                    totalCount: { $sum: "$count" }, // Sum count
                    recordCount: { $sum: 1 } // Count number of records per date
                }
            },
            {
                $sort: { _id: -1 } // Sort by date in descending order (latest first)
            },
            {
                $limit: daysCount // Limit to the latest 'count' days
            }
        ]);

        if (!records || records.length === 0) {
            return next(new AppError("No records found for this exercise", 404));
        }

        res.status(200).json({ records });

    } catch (err) {
        return next(new AppError(err.message, 500));
    }
});


