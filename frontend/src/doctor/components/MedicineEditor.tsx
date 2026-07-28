import React, { useState, useEffect } from 'react';
import { Pill, X, Sparkles, Plus, Edit2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Medicine {
  id: string;
  text: string;
  isAi: boolean;
  isEditing?: boolean;
}

interface MedicineEditorProps {
  className?: string;
}

const MedicineEditor: React.FC<MedicineEditorProps> = ({ className }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [newMedicine, setNewMedicine] = useState('');
  const [isListening, setIsListening] = useState(true);
  const [editText, setEditText] = useState('');

  // Simulate live transcription
  useEffect(() => {
    const t1 = setTimeout(() => setMedicines(prev => [...prev, { id: '1', text: 'Paracetamol 500mg - SOS', isAi: true }]), 4000);
    const t2 = setTimeout(() => setMedicines(prev => [...prev, { id: '2', text: 'Ibuprofen 400mg - Twice daily', isAi: true }]), 8500);
    const t3 = setTimeout(() => setIsListening(false), 9500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMedicine.trim()) {
      setMedicines([...medicines, { id: Date.now().toString(), text: newMedicine.trim(), isAi: false }]);
      setNewMedicine('');
    }
  };

  const removeMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const startEdit = (medicine: Medicine) => {
    setMedicines(medicines.map(m => m.id === medicine.id ? { ...m, isEditing: true } : m));
    setEditText(medicine.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      setMedicines(medicines.map(m => m.id === id ? { ...m, text: editText.trim(), isEditing: false } : m));
    } else {
      removeMedicine(id);
    }
  };

  return (
    <div className={cn("bg-deep-space rounded-2xl shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="p-3 border-b border-white/10 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-white" />
          <h3 className="font-bold text-sm">Medicines</h3>
        </div>
        {isListening && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-300 uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3 h-3" />
            AI Listening
          </div>
        )}
      </div>
      
      <div className="p-3 space-y-3 flex-1 overflow-y-auto bg-white">
        <ul className="space-y-2">
          {medicines.map((med) => (
            <li key={med.id} className="flex items-center gap-2 text-sm text-deep-space bg-gray-50 px-3 py-2 rounded-lg group animate-in fade-in slide-in-from-right-2">
              {med.isAi ? (
                <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ml-1 mr-1" />
              )}
              
              {med.isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(med.id)}
                    className="flex-1 text-sm bg-white border border-blue-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={() => saveEdit(med.id)} className="text-green-600 hover:text-green-700">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className={cn("flex-1", med.isAi && "text-blue-900")}>{med.text}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => startEdit(med)} className="text-gray-400 hover:text-blue-500 p-1">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeMedicine(med.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
          {isListening && (
            <li className="flex items-center gap-2 text-sm text-gray-400 px-3 py-2">
              <span className="flex h-1.5 w-1.5 relative ml-1 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
              </span>
              <span className="animate-pulse">Waiting for prescription...</span>
            </li>
          )}
        </ul>

        {/* Manual Input */}
        <form onSubmit={addManual} className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
          <input
            type="text"
            value={newMedicine}
            onChange={(e) => setNewMedicine(e.target.value)}
            placeholder="Add manually..."
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-habanero"
          />
          <button 
            type="submit"
            disabled={!newMedicine.trim()}
            className="w-9 h-9 shrink-0 bg-gray-100 text-deep-space hover:bg-gray-200 disabled:opacity-50 rounded-lg flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default MedicineEditor;
