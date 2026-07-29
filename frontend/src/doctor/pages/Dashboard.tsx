import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, Stethoscope, ChevronRight, Activity, FileText, ActivityIcon } from 'lucide-react';

import DoctorSidebar from '../components/DoctorSidebar';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import AIBanner from '../components/AIBanner';
import ConsultationCard from '../components/ConsultationCard';
import ActivityItem from '../components/ActivityItem';
import { Specialization, ConsultationStatus, Priority } from '../../types';
import type { DashboardResponse } from '../../types';

// Mock Data
const dashboardData: DashboardResponse = {
  doctor: {
    id: "d1",
    name: "Dr. Priya Sharma",
    initials: "PS",
    specialization: Specialization.GENERAL_PHYSICIAN
  },
  stats: {
    todayAppointments: 8,
    completedAppointments: 3,
    aiInsightsReady: true
  },
  todayConsultations: [
    {
      id: "c1",
      patient: { id: "p1", name: "Ramesh Kumar", initials: "RK", age: 42, gender: "M", avatarColorClass: "bg-blue-50 text-blue-600" },
      tags: [
        { label: "Chest Pain", variant: "default" },
        { label: "Scheduled", variant: "primary" }
      ],
      time: "10:00 AM",
      chiefComplaint: "Chest Pain",
      status: ConsultationStatus.WAITING,
      priority: Priority.ROUTINE
    },
    {
      id: "c2",
      patient: { id: "p2", name: "Sunita Devi", initials: "SD", age: 31, gender: "F", avatarColorClass: "bg-orange-50 text-orange-600" },
      tags: [
        { label: "Fever", variant: "default" },
        { label: "Urgent", variant: "warning" }
      ],
      time: "11:30 AM",
      chiefComplaint: "Fever",
      status: ConsultationStatus.WAITING,
      priority: Priority.URGENT
    },
    {
      id: "c3",
      patient: { id: "p3", name: "Arjun Singh", initials: "AS", age: 58, gender: "M", avatarColorClass: "bg-green-50 text-green-600" },
      tags: [
        { label: "Diabetes Follow-up", variant: "default" },
        { label: "Follow-up", variant: "success" }
      ],
      time: "2:00 PM",
      chiefComplaint: "Diabetes Follow-up",
      status: ConsultationStatus.WAITING,
      priority: Priority.ROUTINE
    }
  ],
  recentActivities: [
    {
      id: "a1",
      message: "Prescription sent to Meena Patel",
      timeAgo: "12 min ago",
      iconName: "FileText",
      colorScheme: "blue"
    },
    {
      id: "a2",
      message: "Follow-up scheduled for Ravi Singh",
      timeAgo: "34 min ago",
      iconName: "CalendarCheck",
      colorScheme: "purple"
    },
    {
      id: "a3",
      message: "AI flagged drug interaction for Sunita Devi",
      timeAgo: "1 hr ago",
      iconName: "ActivityIcon",
      colorScheme: "red"
    }
  ]
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState(dashboardData.todayConsultations);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await fetch('/api/appointments/doctor/d1');
        if (res.ok) {
          const dbAppointments = await res.json();
          // Map DB appointments to the frontend Consultation structure
          const formatted = dbAppointments.map((app: any) => ({
            id: app.id,
            patient: { 
              id: app.id, 
              name: app.patientName, 
              initials: app.patientName.split(' ').map((n: string) => n[0]).join('').substring(0, 2), 
              age: parseInt(app.patientAge) || 30, 
              gender: app.patientGender === 'Male' ? 'M' : 'F', 
              avatarColorClass: "bg-blue-50 text-blue-600" 
            },
            tags: [
              { label: app.healthConcern === 'specific-symptoms' && app.symptoms && app.symptoms.length > 0 ? app.symptoms[0] : 'Consultation', variant: "default" },
              { label: app.status === 'WAITING' ? "Scheduled" : app.status, variant: "primary" }
            ],
            time: app.timeSlot,
            chiefComplaint: app.healthConcern === 'specific-symptoms' && app.symptoms && app.symptoms.length > 0 ? app.symptoms.join(', ') : 'General Consultation',
            status: ConsultationStatus.WAITING,
            priority: app.priority === 'URGENT' ? Priority.URGENT : Priority.ROUTINE
          }));
          
          // Prepend new appointments to mock ones for demo purposes
          setConsultations([...formatted, ...dashboardData.todayConsultations]);
        }
      } catch (err) {
        console.error("Failed to fetch appointments", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAppointments();
  }, []);

  return (
    <div className="flex h-screen bg-luster-white font-sans text-deadly-depths">
      <DoctorSidebar />

      <main className="flex-1 overflow-y-auto p-8 relative">
        <DashboardHeader 
          doctor={dashboardData.doctor}
          date="Wednesday, 23 July 2025" 
          notificationCount={3}
        />

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Today's Appointments" 
            value={<span className="text-habanero">{consultations.length}</span>} 
            subtitle="Scheduled today" 
            icon={CalendarCheck} 
          />
          <StatCard 
            title="Completed" 
            value={<span className="text-green-500">{dashboardData.stats.completedAppointments}</span>} 
            subtitle="Done so far" 
            icon={CheckCircle2} 
            iconColorClass="text-green-500"
          />
          <StatCard 
            title="AI Insights Ready" 
            value={
              <div className="flex items-center gap-2 mt-3 mb-4 bg-gray-50 w-fit px-3 py-1 rounded-full border border-gray-200 h-10">
                <span className="w-2 h-2 rounded-full bg-habanero animate-pulse"></span>
                <span className="text-sm font-bold text-deep-space">Active & Listening</span>
              </div>
            } 
            subtitle="Your clinical co-pilot is on" 
            icon={Stethoscope} 
            iconColorClass="text-habanero"
          />
        </div>

        <AIBanner 
          message="AI Assistant is ready. It will auto-summarize patient records and suggest diagnoses during consultations." 
          className="mb-8"
        />

        {/* Main Grid: Consultations & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Schedule */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs font-bold text-aster-blue uppercase tracking-wider mb-1">Your Schedule</p>
                <h2 className="text-xl font-bold text-deep-space">Today's Assigned Consultations</h2>
              </div>
              <button className="text-sm font-medium text-habanero hover:underline flex items-center gap-1">
                View schedule <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading appointments...</div>
              ) : (
                consultations.map((consultation) => (
                  <ConsultationCard
                    key={consultation.id}
                    consultation={consultation}
                    onViewPatient={() => navigate(`/doctor/patient/${consultation.patient.id}`)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Column: Actions & Activity */}
          <div>

            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-xs font-bold text-transparent uppercase tracking-wider mb-1 select-none">.</p>
                <h2 className="text-xl font-bold text-deep-space">Recent Activity</h2>
              </div>
              <Activity className="w-5 h-5 text-aster-blue mb-1" />
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-jodhpur-tan/30">
              <div className="space-y-6">
                <ActivityItem 
                  message="Prescription sent to Meena Patel" 
                  timeAgo="12 min ago" 
                  icon={FileText} 
                  colorScheme="blue" 
                />
                <ActivityItem 
                  message="Follow-up scheduled for Ravi Singh" 
                  timeAgo="34 min ago" 
                  icon={CalendarCheck} 
                  colorScheme="purple" 
                />
                <ActivityItem 
                  message="AI flagged drug interaction for Sunita Devi" 
                  timeAgo="1 hr ago" 
                  icon={ActivityIcon} 
                  colorScheme="red" 
                />
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
