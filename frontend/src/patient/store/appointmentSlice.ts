import { createSlice } from '@reduxjs/toolkit';
// import type { PayloadAction } from '@reduxjs/toolkit';

interface AppointmentState {
  appointments: []; // TODO: Replace with Appointment[] type
  isLoading: boolean;
}

const initialState: AppointmentState = {
  appointments: [],
  isLoading: false,
};

const appointmentSlice = createSlice({
  name: 'appointment',
  initialState,
  reducers: {
    // setAppointments: (state, action) => {},
    // addAppointment: (state, action) => {},
    // cancelAppointment: (state, action) => {},
  },
});

export const { /* setAppointments, addAppointment, cancelAppointment */ } = appointmentSlice.actions;
export default appointmentSlice.reducer;
