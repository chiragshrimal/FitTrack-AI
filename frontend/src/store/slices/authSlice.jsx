import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  isAuthenticated: !!localStorage.getItem('user'),
  userType: localStorage.getItem('userType') || null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.userType = action.payload?.userType;
      localStorage.setItem('user', JSON.stringify(action.payload));
      localStorage.setItem('userType', action.payload?.userType);
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.userType = null;
      localStorage.removeItem('user');
      localStorage.removeItem('userType');
    },
  },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;