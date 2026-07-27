import { createSlice } from '@reduxjs/toolkit';
// import type { PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  user: null; // TODO: Replace with Patient type
  token: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // setCredentials: (state, action) => {},
    // logout: (state) => {},
  },
});

export const { /* setCredentials, logout */ } = authSlice.actions;
export default authSlice.reducer;
