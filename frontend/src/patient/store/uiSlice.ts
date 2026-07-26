import { createSlice } from '@reduxjs/toolkit';
// import type { PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  isSidebarOpen: boolean;
  theme: 'light' | 'dark';
  isLoading: boolean;
}

const initialState: UiState = {
  isSidebarOpen: true,
  theme: 'light',
  isLoading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // toggleSidebar: (state) => {},
    // setTheme: (state, action) => {},
    // setLoading: (state, action) => {},
  },
});

export const { /* toggleSidebar, setTheme, setLoading */ } = uiSlice.actions;
export default uiSlice.reducer;
