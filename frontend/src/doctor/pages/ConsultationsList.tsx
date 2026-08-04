import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorSidebar from '../components/DoctorSidebar';
import PageHeader from '../components/PageHeader';
import { getToken } from '../../auth/authStorage';

interface AppointmentPatient {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  age: string;
}

const getInitials = (name?: string) => {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const ConsultationsList: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<AppointmentPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/appointments', {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!response.ok) throw new Error('Unable to load appointments');

        const appointments = await response.json();
        const uniquePatients = new Map<string, AppointmentPatient>();
        for (const appointment of Array.isArray(appointments) ? appointments : []) {
          const id = String(appointment.patient?.id || appointment.patientId || appointment.id);
          if (!uniquePatients.has(id)) {
            uniquePatients.set(id, {
              id,
              fullName: appointment.patientName || appointment.patient?.user?.fullName || 'Patient',
              email: appointment.patientEmail || appointment.patient?.user?.email || 'No email',
              phone: appointment.patientPhone || appointment.patient?.phone || '',
              gender: appointment.patientGender || appointment.patient?.gender || 'Not specified',
              age: appointment.patientAge || appointment.patient?.age || '',
            });
          }
        }
        setPatients([...uniquePatients.values()]);
      } catch (err) {
        console.error('Failed to fetch appointment patients', err);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };
    loadPatients();
  }, []);

  return (
    <div className="flex h-screen bg-luster-white font-sans text-deep-space">
      <DoctorSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-8">
        <PageHeader 
          title="Patients" 
          onBack={() => navigate('/doctor/dashboard')}
        />
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-4 pb-12">
            <h2 className="text-lg font-bold mb-4 text-deep-space/80">Patients with Your Appointments</h2>
            
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading patients...</div>
            ) : patients.length > 0 ? (
              patients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      {getInitials(patient.fullName)}
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{patient.fullName}</p>
                      <p className="text-sm text-slate-500">{patient.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-700">{patient.phone || 'No phone'}</p>
                    <p className="text-xs text-slate-500">{patient.gender || 'Not specified'}{patient.age ? ` • ${patient.age}` : ''}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-jodhpur-tan/30">
                <p className="text-gray-500">No appointments have been assigned to you yet.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConsultationsList;
