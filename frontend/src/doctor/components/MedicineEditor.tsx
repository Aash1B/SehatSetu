import React, { useState, useEffect, useRef } from 'react';
import { Pill, X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { searchCatalog } from '../data/prescriptionCatalog';

export interface StructuredMedicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  isAi: boolean;
}

interface MedicineEditorProps {
  className?: string;
  aiExtractedMedicines?: string[];
  isListening?: boolean;
  onChange?: (items: StructuredMedicine[]) => void;
}

/** Parse a free-text medicine string like "Tab. Paracetamol 650mg - 1-0-1 (5 days)" into structured fields */
function parseMedicineText(text: string): Omit<StructuredMedicine, 'id' | 'isAi'> {
  // Try to extract dosage (e.g. 650mg, 500 mg)
  const dosageMatch = text.match(/(\d+\s?(?:mg|ml|mcg|g|IU|units?)\b)/i);
  // Try to extract frequency patterns like 1-0-1, TDS, BD, OD, SOS
  const freqMatch = text.match(/\b(\d-\d-\d|\d-\d-\d-\d|OD|BD|TDS|QID|SOS|HS|PRN|BID|once daily|twice daily|thrice daily)\b/i);
  // Try to extract duration like "5 days", "2 weeks", "1 month"
  const durMatch = text.match(/\b(\d+\s?(?:day|days|week|weeks|month|months))\b/i);
  // Extract timing after "After" or "Before"
  const timingMatch = text.match(/\b(After Food|Before Food|With Food|Empty Stomach|At Bedtime|Morning|Night)\b/i);

  // Strip extracted parts to get clean name
  let name = text
    .replace(dosageMatch?.[0] || '', '')
    .replace(freqMatch?.[0] || '', '')
    .replace(durMatch?.[0] || '', '')
    .replace(timingMatch?.[0] || '', '')
    .replace(/[-–—]/g, ' ')
    .replace(/\(|\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!name) name = text.split(/[\s-]/)[0]; // fallback

  return {
    name,
    dosage: dosageMatch?.[1] || '',
    frequency: freqMatch?.[1] || '',
    duration: durMatch?.[1] || '',
    timing: timingMatch?.[1] || 'After Food',
  };
}

const TIMING_OPTIONS = ['After Food', 'Before Food', 'With Food', 'Empty Stomach', 'At Bedtime', 'Morning', 'Night'];
const FREQ_OPTIONS = ['OD', 'BD', 'TDS', 'QID', 'SOS', '1-0-1', '1-1-1', '0-0-1', '1-0-0'];

const MedicineEditor: React.FC<MedicineEditorProps> = ({ className, aiExtractedMedicines, onChange }) => {
  const [medicines, setMedicines] = useState<StructuredMedicine[]>([
    { id: '1', name: 'Tab. Paracetamol', dosage: '650mg', frequency: '1-0-1', duration: '5 days', timing: 'After Food', isAi: true },
    { id: '2', name: 'Tab. Cetirizine', dosage: '10mg', frequency: 'SOS', duration: '3 days', timing: 'After Food', isAi: true },
  ]);
  const [newMedicine, setNewMedicine] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = searchCatalog('MEDICINE', newMedicine);

  // Report structured medicines to parent whenever they change
  useEffect(() => {
    onChange?.(medicines);
  }, [medicines]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const existingNames = new Set(prev.map(m => m.name.toLowerCase()));
        const newItems = aiExtractedMedicines
          .filter(m => !existingNames.has(m.toLowerCase()))
          .map(m => ({
            id: Math.random().toString(),
            ...parseMedicineText(m),
            isAi: true,
          }));
        return [...prev, ...newItems];
      });
    }
  }, [aiExtractedMedicines]);

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMedicine.trim()) {
      const parsed = parseMedicineText(newMedicine.trim());
      const newItem: StructuredMedicine = {
        id: Date.now().toString(),
        ...parsed,
        isAi: false,
      };
      setMedicines(prev => [...prev, newItem]);
      setExpandedId(newItem.id); // auto-expand so doctor can fill details
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
    setMedicines(prev => prev.filter(m => m.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateField = (id: string, field: keyof StructuredMedicine, value: string) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  return (
    <div className={cn('bg-[#9bacd8] rounded-2xl shadow-sm overflow-hidden flex flex-col', className)}>
      {/* Header */}
      <div className="p-3 border-b border-[#7B96C8]/50 flex items-center justify-between text-[#223382] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Pill className="w-4 h-4 text-[#223382]" />
            <h3 className="font-bold text-sm">Medicines</h3>
          </div>
          <div className="text-sm text-green-800 font-semibold">
            ({medicines.length} added)
          </div>
        </div>
      </div>

      {/* Medicine List */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-white">
        {medicines.length === 0 && (
          <div className="flex flex-col items-center justify-center h-20 text-gray-400 text-xs gap-1">
            <Pill className="w-5 h-5 opacity-40" />
            <span>No medicines added yet</span>
          </div>
        )}
        <ul className="divide-y divide-gray-100">
          {medicines.map((med) => (
            <li key={med.id} className="animate-in fade-in slide-in-from-right-2">
              {/* Medicine row summary */}
              <div
                className="relative flex items-center justify-start px-3 py-2 cursor-pointer hover:bg-gray-50 group"
                onClick={() => setExpandedId(expandedId === med.id ? null : med.id)}
              >
                <Pill
                  aria-hidden="true"
                  className="absolute left-3 w-3.5 h-3.5 text-[#223382] shrink-0"
                />
                <div className="flex min-w-0 max-w-full items-center justify-start gap-2 whitespace-nowrap px-5">
                  <span className={cn("text-sm font-semibold truncate", med.isAi ? "text-[#F98513]" : "text-deep-space")}>{med.name || <span className="italic text-gray-400">Unnamed</span>}</span>
                  <span className="text-[11px] text-gray-500 truncate">
                    {[med.dosage, med.frequency, med.duration, med.timing].filter(Boolean).join(' · ') || 'Tap to fill details'}
                  </span>
                </div>
                <div className="absolute right-3 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeMedicine(med.id); }}
                    className="text-gray-400 hover:text-red-500 p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    title="Remove medicine"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {expandedId === med.id ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Expanded detail fields */}
              {expandedId === med.id && (
                <div className="bg-[#EEF2FF] border-t border-[#BFDBFE] px-3 py-2 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-semibold text-[#1E40AF] uppercase mb-0.5">Medicine Name</label>
                    <input
                      type="text"
                      value={med.name}
                      onChange={e => updateField(med.id, 'name', e.target.value)}
                      className="w-full text-sm bg-white border border-[#BFDBFE] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      placeholder="Medicine name"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#1E40AF] uppercase mb-0.5">Dosage</label>
                    <input
                      type="text"
                      value={med.dosage}
                      onChange={e => updateField(med.id, 'dosage', e.target.value)}
                      className="w-full text-sm bg-white border border-[#BFDBFE] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      placeholder="Dosage"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#1E40AF] uppercase mb-0.5">Frequency</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={e => updateField(med.id, 'frequency', e.target.value)}
                        className="flex-1 text-sm bg-white border border-[#BFDBFE] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2563EB] min-w-0"
                        placeholder="Frequency"
                      />
                      <select
                        value={FREQ_OPTIONS.includes(med.frequency) ? med.frequency : ''}
                        onChange={e => { if (e.target.value) updateField(med.id, 'frequency', e.target.value); }}
                        className="text-xs bg-white border border-[#BFDBFE] rounded-lg px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2563EB] cursor-pointer"
                      >
                        <option value="">...</option>
                        {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#1E40AF] uppercase mb-0.5">Duration</label>
                    <input
                      type="text"
                      value={med.duration}
                      onChange={e => updateField(med.id, 'duration', e.target.value)}
                      className="w-full text-sm bg-white border border-[#BFDBFE] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                      placeholder="Duration"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#1E40AF] uppercase mb-0.5">Timing</label>
                    <select
                      value={med.timing}
                      onChange={e => updateField(med.id, 'timing', e.target.value)}
                      className="w-full text-sm bg-white border border-[#BFDBFE] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2563EB] cursor-pointer"
                    >
                      {TIMING_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Add medicine input */}
      <div ref={containerRef} className="p-3 bg-white border-t border-gray-100 shrink-0 relative">
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute bottom-full mb-1 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
            <div className="bg-[#EEF2FF] px-3 py-1.5 text-[11px] font-semibold text-[#1E40AF] uppercase tracking-wider flex justify-between items-center">
              <span>Suggested Medicines</span>
              <span className="text-[10px] text-[#2563EB] font-normal">Click or Tab to select</span>
            </div>
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-[#EEF2FF] hover:text-[#1E3A8A] transition-colors flex items-center gap-2 cursor-pointer',
                  selectedIndex === idx && 'bg-[#E0E7FF] text-[#1E3A8A] font-medium'
                )}
              >
                <Pill className="w-3 h-3 text-[#2563EB] shrink-0" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={addManual} className="flex gap-2">
          <input
            type="text"
            value={newMedicine}
            onChange={e => {
              setNewMedicine(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Add medicine…"
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
