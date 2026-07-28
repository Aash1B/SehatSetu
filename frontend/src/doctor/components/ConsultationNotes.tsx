import React, { useState } from 'react';
import { FileText, Save, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConsultationNotesProps {
  className?: string;
  initialNotes?: string;
}

const ConsultationNotes: React.FC<ConsultationNotesProps> = ({ className, initialNotes = '' }) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    // In a real app, save to backend
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col", className)}>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-deep-space" />
          <h3 className="font-bold text-deep-space">Doctor's Notes</h3>
        </div>
        <button 
          onClick={handleSave}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
            isSaved 
              ? "bg-green-100 text-green-700"
              : "bg-habanero/10 text-habanero hover:bg-habanero/20"
          )}
        >
          {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Type your clinical observations, diagnosis, or private notes here..."
        className="w-full h-full min-h-[150px] p-4 resize-none focus:outline-none focus:ring-0 text-sm text-deep-space rounded-b-2xl"
      />
    </div>
  );
};

export default ConsultationNotes;
