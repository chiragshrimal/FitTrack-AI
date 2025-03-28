import asyncHandler from '../middlewares/asyncHandler.middleware.js';
import AppError from '../utils/appError.js';
import User from '../models/trainee.model.js';
import {ApiError} from '../utils/ApiError.js';

const cookieOptions = {
  secure: process.env.NODE_ENV === 'production' ? true : false,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
};

// generate the Access token and Refresh token 

const generateAccessAndRefereshTokens = async(userId) =>{
  try {
      const user = await User.findById(userId)
      const accessToken = await user.generateAccessToken()
      const refreshToken = await user.generateRefreshToken()
      // console.log(refreshToken);
      // console.log(accessToken);

      user.refreshToken = refreshToken
      await user.save({ validateBeforeSave: false })

      return {accessToken, refreshToken}


  } catch (error) {
      throw new ApiError(500, "Something went wrong while generating referesh and access token")
  }
}

/**
 * @REGISTER
 * @ROUTE @POST 
 * @ACCESS Public
 */
const registerTrainee = asyncHandler(async (req, res, next) => {
  // Destructuring the necessary data from req object
  const {username, name,email, password,age, height, weight,gender} = req.body;

  // Check if the data is there or not, if not throw error message
  if (!username || !email || !password || !age || !height || !weight  || !name || !gender) {
    return next(new AppError('All fields are required', 400));
  }

  try {
    const userNameExists = await User.findOne({ username});

  if(userNameExists){
    return next(new AppError("Username already exists",410));
  }

  // Check if the user exists with the provided email
  const emailExists = await User.findOne({ email});

  // If user exists send the reponse
  if (emailExists) {
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
      new AppError('Trainee registration failed, please try again later', 402)
    );
  }
  // Save the user object
  // await user.save();

  const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

  // console.log(accessToken);
  // console.log(refreshToken);

  // const loggedIn = await User.findById(user._id).select("-refreshToken")
  user.password=undefined;

  const options = {
      httpOnly: true,
      secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      success : true,
      message : "Trainee register successfuly",
      user,accessToken,refreshToken
    })
  } catch (error) {
    return next(new AppError(error.message ,500));
  }

});

/**
 * @LOGIN
 * @ROUTE @POST 
 * @ACCESS Public
 */
const loginTrainee = asyncHandler(async (req, res, next) => {
  // Destructuring the necessary data from req object
  const { email, password } = req.body;

  // Check if the data is there or not, if not throw error message
  if (!email || !password) {
    return next(new AppError('Email and Password are required', 400));
  }

  try {
    // Finding the user with the sent email
  const user = await User.findOne({email}).select("+password");

  // If no user or sent password do not match then send generic response
  if (!(user && (await user.comparePassword(password)))) {
    return next(
      new AppError('Email or Password does not match', 401)
    );
  }

  const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user.id)

  // const  = await User.findById(user.id).select("-refreshToken")
  user.password=undefined;

  const options = {
      httpOnly: true,
      secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      success : true,
      message : "Trainee loggedIn successfuly",
      user,accessToken,refreshToken
    })
  } catch (error) {
    return next(new AppError(error.message , 500));
  }
});

// refresh token se Access token ko renew krate hai 
const refreshAccessToken = asyncHandler(async (req, res) => {

  // frontend se refresh token aayega 
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
      throw new ApiError(411, "unauthorized request")
  }

  try {
      const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
      )
  
      const user = await User.findById(decodedToken?._id)
  
      if (!user) {
          throw new ApiError(411, "Invalid refresh token")
      }
  
      if (incomingRefreshToken !== user?.refreshToken) {
          throw new ApiError(411, "Refresh token is expired or used")
          
      }
  
      const options = {
          httpOnly: true,
          secure: true
      }
  
      const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
  
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options).json({
        success: true,
        message : "Access token refreshed",
        accessToken,refreshToken: newRefreshToken
      })
  } catch (error) {
      throw new ApiError(411, error?.message || "Invalid refresh token")
  }

})


/**
 * @LOGOUT
 * @ROUTE @POST
 * @ACCESS Public
 */
const logoutTrainee = asyncHandler(async(req, res) => {

  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
          $unset: {
              refreshToken: 1 // this removes the field from document
          }
      },
      {
          new: true
      }
  )

  const options = {
      httpOnly: true,
      secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json({
    success: true,
    message : "Trainee logout successfully"
  })

  } catch (error) {
    
    next(new AppError(error.message , 500));
  }
});

/**
 * @LOGGED_IN_USER_DETAILS
 * @ROUTE @GET
 * @ACCESS Private(Logged in users only)
 */
const getLoggedInTraineeDetails = asyncHandler(async (req, res, next) => {
  // Finding the user using the id from modified req object

  try {
    const user = await User.findById(req.user.id).select("-refreshToken");

  return res
  .status(200)
  .json({
    success: true,
    message : "Trainee details fetched successfully",
    user
  })
  } catch (error) {
    
    next(new AppError(error.message, 500));
  }
  
});

export {loginTrainee, 
  logoutTrainee, 
  registerTrainee, 
  refreshAccessToken, 
  getLoggedInTraineeDetails,
};