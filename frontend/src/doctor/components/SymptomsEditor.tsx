import React, { useState, useEffect, useRef } from 'react';
import { Stethoscope, X, Plus, Edit2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { searchCatalog } from '../data/prescriptionCatalog';

interface Symptom {
  id: string;
  text: string;
  isAi: boolean;
  isEditing?: boolean;
}

interface SymptomsEditorProps {
  className?: string;
  aiExtractedSymptoms?: string[];
  isListening?: boolean;
  onChange?: (items: string[]) => void;
}

const SymptomsEditor: React.FC<SymptomsEditorProps> = ({ className, aiExtractedSymptoms, onChange }) => {
  const [symptoms, setSymptoms] = useState<Symptom[]>([
    { id: '1', text: 'Persistent Fever (4 days)', isAi: true },
    { id: '2', text: 'Body ache & Fatigue', isAi: true }
  ]);
  const [newSymptom, setNewSymptom] = useState('');
  const [isListening, setIsListening] = useState(true);
  const [editText, setEditText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Report symptom text list to parent whenever symptoms change
  useEffect(() => {
    onChange?.(symptoms.map(s => s.text));
  }, [symptoms]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredSuggestions = searchCatalog('SYMPTOM', newSymptom);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Automatically add live AI extracted symptoms from speech/audio
  useEffect(() => {
    if (aiExtractedSymptoms && aiExtractedSymptoms.length > 0) {
      setSymptoms(prev => {
        const existingText = new Set(prev.map(s => s.text.toLowerCase()));
        const newItems = aiExtractedSymptoms
          .filter(s => !existingText.has(s.toLowerCase()))
          .map(s => ({ id: Math.random().toString(), text: s, isAi: true }));
        return [...prev, ...newItems];
      });
    }
  }, [aiExtractedSymptoms]);

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymptom.trim()) {
      setSymptoms([...symptoms, { id: Date.now().toString(), text: newSymptom.trim(), isAi: false }]);
      setNewSymptom('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setNewSymptom(suggestion);
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

  const removeSymptom = (id: string) => {
    setSymptoms(symptoms.filter(s => s.id !== id));
  };

  const startEdit = (symptom: Symptom) => {
    setSymptoms(symptoms.map(s => s.id === symptom.id ? { ...s, isEditing: true } : s));
    setEditText(symptom.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      setSymptoms(symptoms.map(s => s.id === id ? { ...s, text: editText.trim(), isEditing: false } : s));
    } else {
      removeSymptom(id);
    }
  };

  return (
    <div className={cn("bg-[#9bacd8] rounded-2xl shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="p-3 border-b border-[#7B96C8]/50 flex items-center justify-between text-[#223382]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-[#223382]" />
            <h3 className="font-bold text-sm">Symptoms</h3>
          </div>
        </div>
      </div>
      
      <div className="p-3 flex-1 min-h-0 overflow-y-auto bg-white">
        <ul className="space-y-2">
          {symptoms.map((sym) => (
            <li key={sym.id} className="flex items-center gap-2 text-sm text-deep-space bg-gray-50 px-3 py-2 rounded-lg group animate-in fade-in slide-in-from-right-2">
              {sym.isAi ? (
                <Stethoscope className="w-3.5 h-3.5 text-[#223382] shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#9bacd8] shrink-0 ml-1 mr-1" />
              )}
              
              {sym.isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(sym.id)}
                    className="flex-1 text-sm bg-white border border-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                  <button onClick={() => saveEdit(sym.id)} className="text-green-600 hover:text-green-700">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className={cn("flex-1", sym.isAi && "text-[#F98513]")}>{sym.text}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => startEdit(sym)} className="text-gray-400 hover:text-blue-500 p-1">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeSymptom(sym.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Fixed Bottom Input with Autocomplete Recommendations */}
      <div ref={containerRef} className="p-3 bg-white border-t border-gray-100 shrink-0 relative mt-auto">
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute bottom-full mb-1 left-3 right-3 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100 max-h-48 overflow-y-auto">
            <div className="bg-purple-50 px-3 py-1.5 text-[11px] font-semibold text-purple-700 uppercase tracking-wider flex justify-between items-center">
              <span>Suggested Symptoms</span>
              <span className="text-[10px] text-purple-500 font-normal">Click or press Tab/Enter to select</span>
            </div>
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-900 transition-colors flex items-center gap-2 cursor-pointer",
                  selectedIndex === idx && "bg-purple-100 text-purple-900 font-medium"
                )}
              >
                <Stethoscope className="w-3 h-3 text-purple-500 shrink-0" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={addManual} className="flex gap-2">
          <input
            type="text"
            value={newSymptom}
            onChange={(e) => {
              setNewSymptom(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Add symptom…"
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-habanero"
          />
          <button 
            type="submit"
            disabled={!newSymptom.trim()}
            className="w-9 h-9 shrink-0 bg-gray-100 text-deep-space hover:bg-gray-200 disabled:opacity-50 rounded-lg flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default SymptomsEditor;
