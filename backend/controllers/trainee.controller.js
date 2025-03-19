// import crypto from 'crypto';
// import fs from 'fs/promises';

// import cloudinary from 'cloudinary';

import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/AppError.js';
import User from '../models/trainee.model.js';
// import sendEmail from '../utils/sendEmail.js';

const cookieOptions = {
  secure: process.env.NODE_ENV === 'production' ? true : false,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
};

/**
 * @REGISTER
 * @ROUTE @POST {{URL}}/api/v1/user/register
 * @ACCESS Public
 */
export const registerTrainee = asyncHandler(async (req, res, next) => {
  // Destructuring the necessary data from req object
  const {username, name,email, password,age, height, weight,gender} = req.body;

  // Check if the data is there or not, if not throw error message
  if (!username || !email || !password || !age || !height || !weight  || !name || !gender) {
    return next(new AppError('All fields are required', 400));
  }

  // Check if the user exists with the provided email
  const userExists = await User.findOne({ email ,username});

  // If user exists send the reponse
  if (userExists) {
    return next(new AppError('Email already exists', 409));
  }

  // Create new user with the given necessary data and save to DB
  const user = await User.create({
    username,
    name,
    email,
    password,
    age,
    weight,
    height,
    gender
  });

  // If user not created send message response
  if (!user) {
    return next(
      new AppError('Trainee registration failed, please try again later', 400)
    );
  }
  // Save the user object
  await user.save();

  // Generating a JWT token
  const token = await user.generateJWTToken();

  // Setting the password to undefined so it does not get sent in the response
  user.password = undefined;

  // Setting the token in the cookie with name token along with cookieOptions
  res.cookie('token', token, cookieOptions);

  // If all good send the response to the frontend
  res.status(201).json({
    success: true,
    message: 'Trainee registered successfully',
    data : user,
  });
});

/**
 * @LOGIN
 * @ROUTE @POST {{URL}}/api/v1/user/login
 * @ACCESS Public
 */
export const loginTrainee = asyncHandler(async (req, res, next) => {
  // Destructuring the necessary data from req object
  const { email, password } = req.body;

  // Check if the data is there or not, if not throw error message
  if (!email || !password) {
    return next(new AppError('Email and Password are required', 400));
  }

  // Finding the user with the sent email
  const user = await User.findOne({ email }).select('+password');

  // If no user or sent password do not match then send generic response
  if (!(user && (await user.comparePassword(password)))) {
    return next(
      new AppError('Email or Password do not match or trainee does not exist', 401)
    );
  }

  // Generating a JWT token
  const token = await user.generateJWTToken();

  // Setting the password to undefined so it does not get sent in the response
  user.password = undefined;

  // Setting the token in the cookie with name token along with cookieOptions
  res.cookie('token', token, cookieOptions);

  // If all good send the response to the frontend
  res.status(200).json({
    success: true,
    message: 'Trainee logged in successfully',
    data : user,
  });
});

/**
 * @LOGOUT
 * @ROUTE @POST {{URL}}/api/v1/user/logout
 * @ACCESS Public
 */
export const logoutTrainee = asyncHandler(async (_req, res, _next) => {
  // Setting the cookie value to null
  res.cookie('token', null, {
    secure: process.env.NODE_ENV === 'production' ? true : false,
    maxAge: 0,
    httpOnly: true,
  });

  // Sending the response
  res.status(200).json({
    success: true,
    message: 'Trainee logged out successfully',
  });
});

/**
 * @LOGGED_IN_USER_DETAILS
 * @ROUTE @GET {{URL}}/api/v1/user/me
 * @ACCESS Private(Logged in users only)
 */
export const getLoggedInTraineeDetails = asyncHandler(async (req, res, _next) => {
  // Finding the user using the id from modified req object
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    message: 'Trainee details',
    data : user,
  });
});

export default {registerTrainee, loginTrainee, logoutTrainee, getLoggedInTraineeDetails};