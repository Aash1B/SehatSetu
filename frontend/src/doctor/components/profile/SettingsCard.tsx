import React from 'react';
import SectionCard from '../SectionCard';
import { Bell, Key, LogOut, Shield, User } from 'lucide-react';
import AccountDeletionDangerZone from '../../../auth/components/AccountDeletionDangerZone';

const SettingsCard: React.FC = () => {
  const settingsOptions = [
    { id: 'edit-profile', icon: User, label: 'Edit Profile Information', color: 'text-aster-blue' },
    { id: 'security', icon: Shield, label: 'Security & Privacy', color: 'text-green-500' },
    { id: 'password', icon: Key, label: 'Change Password', color: 'text-habanero' },
    { id: 'notifications', icon: Bell, label: 'Notification Preferences', color: 'text-yellow-500' },
  ];

  return (
    <SectionCard title="Account Settings" className="h-full flex flex-col">
      <div className="space-y-2 flex-1">
        {settingsOptions.map((option) => (
          <button 
            key={option.id}
            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <div className={`p-2 bg-white rounded shadow-sm border border-gray-100 ${option.color}`}>
              <option.icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-deep-space">{option.label}</span>
          </button>
        ))}
      </div>
      
      <div className="pt-4 mt-4 border-t border-gray-100">
        <button className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-bold">Logout Account</span>
        </button>
      </div>
      <AccountDeletionDangerZone role="DOCTOR" />
    </SectionCard>
  );
};

export default SettingsCard;
