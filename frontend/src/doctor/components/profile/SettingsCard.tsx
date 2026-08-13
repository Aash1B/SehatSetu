import React, { useState } from 'react';
import SectionCard from '../SectionCard';
import { Key } from 'lucide-react';
import AccountDeletionDangerZone from '../../../auth/components/AccountDeletionDangerZone';
import { ChangePasswordModal } from './ChangePasswordModal';

const SettingsCard: React.FC = () => {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  return (
    <SectionCard className="h-full flex flex-col">
      <div className="space-y-2 flex-1">
        <button
          type="button"
          onClick={() => setIsChangePasswordOpen(true)}
          className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors text-left cursor-pointer group"
        >
          <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200 text-[#F98513] group-hover:scale-105 transition-transform">
            <Key className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-slate-900 group-hover:text-[#223382] transition-colors">
            Change Password
          </span>
        </button>
      </div>

      <AccountDeletionDangerZone role="DOCTOR" />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </SectionCard>
  );
};

export default SettingsCard;
