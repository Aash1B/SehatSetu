import React from 'react';
import { Link } from 'react-router-dom';
import { User, Stethoscope } from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">Welcome to SehatSetu</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Connecting patients with specialized healthcare professionals seamlessly.
          Please select your portal to continue.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 max-w-4xl w-full justify-center">
        {/* Patient Portal Card */}
        <Link 
          to="/patient/login" 
          className="group flex-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <User className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Patient Portal</h2>
          <p className="text-gray-500">
            Book appointments, consult with doctors via video, and manage your health records.
          </p>
        </Link>

        {/* Doctor Portal Card */}
        <Link 
          to="/doctor/login" 
          className="group flex-1 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-100 transition-all duration-300 flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
            <Stethoscope className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Doctor Portal</h2>
          <p className="text-gray-500">
            Manage your patient queue, conduct consultations, and write digital prescriptions.
          </p>
        </Link>
      </div>
    </div>
  );
};

export default LandingPage;
