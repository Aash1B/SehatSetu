import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type PageType = 'landing' | 'book-appointment' | 'dashboard' | 'doctors';
export type DashboardTabType = 'overview' | 'appointments' | 'video' | 'records' | 'prescriptions' | 'profile';

interface UiState {
  isSidebarOpen: boolean;
  theme: 'light' | 'dark';
  isLoading: boolean;
  currentPage: PageType;
  dashboardTab: DashboardTabType;
}

const initialState: UiState = {
  isSidebarOpen: false,
  theme: 'light',
  isLoading: false,
  currentPage: 'landing',
  dashboardTab: 'overview',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    openSidebar: (state) => {
      state.isSidebarOpen = true;
    },
    closeSidebar: (state) => {
      state.isSidebarOpen = false;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setCurrentPage: (state, action: PayloadAction<PageType>) => {
      state.currentPage = action.payload;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    setDashboardTab: (state, action: PayloadAction<DashboardTabType>) => {
      state.dashboardTab = action.payload;
    },
  },
});

export const { toggleSidebar, openSidebar, closeSidebar, setTheme, setLoading, setCurrentPage, setDashboardTab } = uiSlice.actions;
export default uiSlice.reducer;
