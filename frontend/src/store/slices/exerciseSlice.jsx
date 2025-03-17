import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activities: [],
  currentActivity: null,
  stats: {},
};

const exerciseSlice = createSlice({
  name: 'exercise',
  initialState,
  reducers: {
    setActivities: (state, action) => {
      state.activities = action.payload;
    },
    setCurrentActivity: (state, action) => {
      state.currentActivity = action.payload;
    },
    setStats: (state, action) => {
      state.stats = action.payload;
    },
  },
});

export const { setActivities, setCurrentActivity, setStats } = exerciseSlice.actions;
export default exerciseSlice.reducer;