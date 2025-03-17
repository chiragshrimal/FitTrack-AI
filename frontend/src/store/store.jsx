import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import exerciseReducer from './slices/exerciseSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    exercise: exerciseReducer,
  },
});

export default store;