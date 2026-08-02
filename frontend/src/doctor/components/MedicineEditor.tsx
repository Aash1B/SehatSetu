import React, { useState, useEffect, useRef } from 'react';
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
  aiExtractedMedicines?: string[];
}

const POPULAR_MEDICINES = [
  'Tab. Paracetamol 650mg - 1-0-1 (5 days)',
  'Tab. Paracetamol 500mg - 1-0-1 (3 days)',
  'Tab. Dolo 650mg - 1-0-1 (SOS for fever)',
  'Tab. Cetirizine 10mg - 0-0-1 (SOS at night)',
  'Tab. Amoxicillin 500mg - 1-0-1 (5 days)',
  'Tab. Azithromycin 500mg - 1-0-0 (3 days)',
  'Tab. Pantoprazole 40mg - 1-0-0 (Before breakfast)',
  'Tab. Omeprazole 20mg - 1-0-0 (Before food)',
  'Tab. Ibuprofen 400mg - 1-0-1 (After food)',
  'Tab. Metformin 500mg - 1-0-1 (After meals)',
  'Tab. Amlodipine 5mg - 1-0-0 (Morning)',
  'Tab. Telmisartan 40mg - 1-0-0 (Morning)',
  'Tab. Montelukast 10mg - 0-0-1 (Night)',
  'Tab. Ondansetron 4mg - SOS (Before meals)',
  'Tab. Ranitidine 150mg - 1-0-1',
  'Tab. Ciprofloxacin 500mg - 1-0-1 (5 days)',
  'Tab. Atorvastatin 10mg - 0-0-1 (Night)',
  'Tab. Losartan 50mg - 1-0-0',
  'Tab. Calpol 650mg - 1-0-1 (SOS)',
  'Tab. Combiflam - 1-0-1 (After food)',
  'Syp. Multivitamin 5ml - 0-0-1',
  'Syp. Cough Syrup 10ml - 1-1-1 (5 days)',
];

const MedicineEditor: React.FC<MedicineEditorProps> = ({ className, aiExtractedMedicines }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([
    { id: '1', text: 'Tab. Paracetamol 650mg - 1-0-1 (5 days)', isAi: true },
    { id: '2', text: 'Tab. Cetirizine 10mg - SOS', isAi: true }
  ]);
  const [newMedicine, setNewMedicine] = useState('');
  const [isListening, setIsListening] = useState(true);
  const [editText, setEditText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on typed text
  const filteredSuggestions = newMedicine.trim().length > 0
    ? POPULAR_MEDICINES.filter(m =>
        m.toLowerCase().includes(newMedicine.trim().toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Automatically add live AI extracted medicines from speech/audio
  useEffect(() => {
    if (aiExtractedMedicines && aiExtractedMedicines.length > 0) {
      setMedicines(prev => {
        const existingText = new Set(prev.map(m => m.text.toLowerCase()));
        const newItems = aiExtractedMedicines
          .filter(m => !existingText.has(m.toLowerCase()))
          .map(m => ({ id: Math.random().toString(), text: m, isAi: true }));
        return [...prev, ...newItems];
      });
    }
  }, [aiExtractedMedicines]);

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMedicine.trim()) {
      setMedicines([...medicines, { id: Date.now().toString(), text: newMedicine.trim(), isAi: false }]);
      setNewMedicine('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setNewMedicine(suggestion);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === 'Tab' || (e.key === 'Enter' && selectedIndex >= 0)) {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
        selectSuggestion(filteredSuggestions[selectedIndex]);
      } else if (filteredSuggestions.length > 0) {
        selectSuggestion(filteredSuggestions[0]);
      }
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const aiItem = { id: Date.now().toString(), text: 'Tab. Paracetamol 650mg - 1-0-1 (5 days)', isAi: true };
              setMedicines(prev => [...prev, aiItem]);
            }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-blue-300 uppercase tracking-wider hover:text-white transition-colors cursor-pointer bg-white/10 px-2 py-0.5 rounded-full"
            title="Click to trigger AI auto-extraction"
          >
            <Sparkles className="w-3 h-3" />
            AI Listening
          </button>
        </div>
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

        {/* Manual Input with Autocomplete Recommendations */}
        <div ref={containerRef} className="relative pt-2 border-t border-gray-100 mt-2">
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
              <div className="bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 uppercase tracking-wider flex justify-between items-center">
                <span>Suggested Medicines</span>
                <span className="text-[10px] text-blue-500 font-normal">Click or press Tab/Enter to select</span>
              </div>
              {filteredSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectSuggestion(suggestion)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors flex items-center gap-2 cursor-pointer",
                    selectedIndex === idx && "bg-blue-100 text-blue-900 font-medium"
                  )}
                >
                  <Pill className="w-3 h-3 text-blue-500 shrink-0" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          <form onSubmit={addManual} className="flex gap-2">
            <input
              type="text"
              value={newMedicine}
              onChange={(e) => {
                setNewMedicine(e.target.value);
                setShowSuggestions(true);
                setSelectedIndex(-1);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              placeholder="Add manually (e.g. Paracetamol, Cetirizine)..."
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
    </div>
  );
};

export default MedicineEditor;
