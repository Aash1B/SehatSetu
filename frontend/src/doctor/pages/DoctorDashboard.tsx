import React from 'react';

const DoctorDashboard: React.FC = () => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Doctor Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Patient Queue Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Patient Queue</h2>
          <p className="text-gray-500 mb-4">View and manage your upcoming appointments.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            View Queue
          </button>
        </div>

        {/* Prescription Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Prescriptions</h2>
          <p className="text-gray-500 mb-4">Write and manage patient prescriptions.</p>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
            New Prescription
          </button>
        </div>

        {/* Availability Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Availability</h2>
          <p className="text-gray-500 mb-4">Manage your schedule and availability slots.</p>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
            Manage Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;
