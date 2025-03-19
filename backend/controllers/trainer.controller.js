import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/AppError.js';
import Trainer from '../models/trainer.model.js';

const cookieOptions = {
  secure: process.env.NODE_ENV === 'production' ? true : false,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
};

/**
 * @REGISTER
 * @ROUTE @POST {{URL}}/api/v1/trainer/register
 * @ACCESS Public
 */
export const registerTrainer = asyncHandler(async (req, res, next) => {
  const { username, name, email, password, age, gender,weight,height } = req.body;
  console.log(req.body);
  
  if (!username || !email || !password || !age || !name || !gender || !weight || !height) { 
    return next(new AppError('All fields are required', 400));
  }
  
  const trainerExists = await Trainer.findOne({ email });
  if (trainerExists) {
    return next(new AppError('Email already exists', 409));
  }
  
  // console.log("working")
  const trainer = await Trainer.create({
    username,
    name,
    email,
    password,
    age,
    gender,
    height,
    weight
  });
  
  if (!trainer) {
    return next(new AppError('Trainer registration failed, please try again later', 400));
  }
  
  await trainer.save();
  const token = await trainer.generateJWTToken();
  trainer.password = undefined;
  res.cookie('token', token, cookieOptions);
  
  res.status(201).json({
    success: true,
    message: 'Trainer registered successfully',
    data: trainer
  });
});

/**
 * @LOGIN
 * @ROUTE @POST {{URL}}/api/trainer/login
 * @ACCESS Public
 */
export const loginTrainer = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError('Email and Password are required', 400));
  }

  const trainer = await Trainer.findOne({ email }).select('+password');
  if (!(trainer && (await trainer.comparePassword(password)))) {
    return next(new AppError('Email or Password do not match or trainer does not exist', 401));
  }

  const token = await trainer.generateJWTToken();
  trainer.password = undefined;
  res.cookie('token', token, cookieOptions);

  res.status(200).json({
    success: true,
    message: 'Trainer logged in successfully',
    data: trainer,
  });
});

/**
 * @LOGOUT
 * @ROUTE @POST {{URL}}/api/v1/trainer/logout
 * @ACCESS Public
 */
export const logoutTrainer = asyncHandler(async (_req, res, _next) => {
  res.cookie('token', null, {
    secure: process.env.NODE_ENV === 'production' ? true : false,
    maxAge: 0,
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    message: 'Trainer logged out successfully',
  });
});

/**
 * @LOGGED_IN_TRAINER_DETAILS
 * @ROUTE @GET {{URL}}/api/v1/trainer/me
 * @ACCESS Private(Logged in trainers only)
 */
export const getLoggedInTrainerDetails = asyncHandler(async (req, res, _next) => {
  const trainer = await Trainer.findById(req.user.id);
  res.status(200).json({
    success: true,
    message: 'Trainer details',
    data: trainer,
  });
});

export default { registerTrainer, loginTrainer, logoutTrainer, getLoggedInTrainerDetails };