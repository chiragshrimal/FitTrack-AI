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
    const { exercise, count, username } = req.query;
    // console.log("received");
    // console.log(count);
    // console.log(username);
    // console.log(exercise);

    // Validate input
    if (!exercise || !username) {
        return next(new AppError("Exercise name is required", 400));
    }

    try {
        const trainee = await User.findOne({ username: username });

        if (!trainee) {
            // console.log("not found");
            return next(new AppError("User not found", 404));
        }

        const records = await PushUp.find({ name: exercise, user: trainee._id })
            .sort({ date: -1 }) 
            .limit(parseInt(count) || 30);

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
    const { exercise, count, username, fillEmptyDays } = req.query;

    // Validate input
    if (!exercise || !username) {
        return next(new AppError("Exercise name and username are required", 400));
    }

    const daysCount = parseInt(count) || 7; // Default to 7 if not provided
    const shouldFillEmptyDays = fillEmptyDays === 'true'; // Parse query parameter

    try {
        // Find the user
        const trainee = await User.findOne({ username }).exec();
        if (!trainee) {
            return next(new AppError("User not found", 404));
        }

        // Calculate date range for last N days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysCount);

        // Aggregate workout records for the user within date range
        const records = await PushUp.aggregate([
            {
                $match: {
                    name: exercise,
                    user: new mongoose.Types.ObjectId(trainee._id),
                    date: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date" }
                    },
                    // Store a reference date for this group (first occurrence)
                    createdAt: { $first: "$date" },
                    totalDuration: { $sum: "$duration" },
                    totalCount: { $sum: "$count" },
                    recordCount: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 } // Sort by date ascending
            },
            {
                $project: {
                    _id: 1,
                    createdAt: 1,
                    totalDuration: 1,
                    totalCount: 1,
                    recordCount: 1,
                    date: {
                        $dateToString: {
                            format: "%B %d, %Y",
                            date: "$createdAt",
                            timezone: "Asia/Kolkata"
                        }
                    }
                }
            }
        ]).exec();
        
        // If no records found
        if (!records || records.length === 0) {
            return next(new AppError("No records found for this exercise in the last " + daysCount + " days", 404));
        }

        // Only fill missing days if explicitly requested
        const responseRecords = shouldFillEmptyDays ? 
            fillMissingDays(records, startDate, endDate) : 
            records;
        
        res.status(200).json({ records: responseRecords });
    } catch (err) {
        return next(new AppError(err.message, 500));
    }
});

// Helper function to fill in missing days in the date range with zero values
function fillMissingDays(records, startDate, endDate) {
    const recordsMap = {};
    
    // Create a map of existing records by date string
    records.forEach(record => {
        recordsMap[record._id] = record;
    });
    
    const filledRecords = [];
    const currentDate = new Date(startDate);
    
    // Loop through each day in the range
    while (currentDate <= endDate) {
        // Format date consistent with the _id format from MongoDB aggregation
        const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (recordsMap[dateString]) {
            // Use existing record if available
            filledRecords.push(recordsMap[dateString]);
        } else {
            // Create a placeholder record with zeros
            filledRecords.push({
                _id: dateString,
                createdAt: new Date(currentDate),
                totalDuration: 0,
                totalCount: 0,
                recordCount: 0,
                date: currentDate.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'Asia/Kolkata'
                })
            });
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return filledRecords;
}