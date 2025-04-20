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


// TODO
export const fetchWorkoutByRecord = asyncHandler(async (req, res, next) => {
    const { exercise, count, username } = req.query;

    // Validate input
    if (!exercise) {
        return next(new AppError("Exercise name is required", 400));
    }

    try {

        const trainee = await User.findOne({ username: username });

        if (!trainee) {
            return next(new AppError("User not found", 404));
        }

        const records = await PushUp.find({ name: exercise, user: trainee._id })
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
    const { exercise, count, username } = req.query;

    // Validate input
    if (!exercise) {
        return next(new AppError("Exercise name and username are required", 400));
    }

    const daysCount = parseInt(count) || 7; // Default to last 7 days if count is not provided

    try {
        // Find the trainee by username
        const trainee = await User.findOne({ username }).exec();

        if (!trainee) {
            return next(new AppError("User not found", 404));
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999); // Set to end of today

        const pastDate = new Date();
        pastDate.setDate(today.getDate() - daysCount);
        pastDate.setHours(0, 0, 0, 0); // Set to start of pastDate

        // Aggregate workout records for the user
        const records = await PushUp.aggregate([
            {
                $match: { 
                    name: exercise, 
                    user: new mongoose.Types.ObjectId(trainee._id), 
                    date: { $gte: pastDate, $lte: today } // Filter records from the last 'count' days
                }
            },
            {
                $group: {
                    _id: { 
                        $dateToString: { format: "%Y-%m-%d", date: "$date" } // Group by date (YYYY-MM-DD)
                    },
                    totalDuration: { $sum: "$duration" }, // Sum of duration
                    totalCount: { $sum: "$count" }, // Sum of count
                    recordCount: { $sum: 1 } // Total records on that date
                }
            },
            {
                $sort: { _id: -1 } // Sort by latest date first
            },
            {
                $limit: daysCount // Return only the last 'count' days
            }
        ]).exec();

        if (!records || records.length === 0) {
            return next(new AppError("No records found for this exercise", 404));
        }

        // Convert `_id` (date) to IST format before returning
        const formattedRecords = records.map(record => ({
            date: new Date(record._id).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                year: "numeric",
                month: "long",
                day: "numeric"
            }),
            totalDuration: record.totalDuration,
            totalCount: record.totalCount,
            recordCount: record.recordCount
        }));

        res.status(200).json({ records: formattedRecords });

    } catch (err) {
        return next(new AppError(err.message, 500));
    }
});



