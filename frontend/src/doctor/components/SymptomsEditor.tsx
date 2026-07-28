import React, { useState, useEffect } from 'react';
import { Stethoscope, X, Sparkles, Plus, Edit2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Symptom {
  id: string;
  text: string;
  isAi: boolean;
  isEditing?: boolean;
}

interface SymptomsEditorProps {
  className?: string;
}

const SymptomsEditor: React.FC<SymptomsEditorProps> = ({ className }) => {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [newSymptom, setNewSymptom] = useState('');
  const [isListening, setIsListening] = useState(true);
  const [editText, setEditText] = useState('');

  // Simulate live transcription
  useEffect(() => {
    const t1 = setTimeout(() => setSymptoms(prev => [...prev, { id: '1', text: 'Persistent Fever (4 days)', isAi: true }]), 2000);
    const t2 = setTimeout(() => setSymptoms(prev => [...prev, { id: '2', text: 'Body ache', isAi: true }]), 4500);
    const t3 = setTimeout(() => setSymptoms(prev => [...prev, { id: '3', text: 'Headache', isAi: true }]), 7000);
    const t4 = setTimeout(() => setIsListening(false), 8000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSymptom.trim()) {
      setSymptoms([...symptoms, { id: Date.now().toString(), text: newSymptom.trim(), isAi: false }]);
      setNewSymptom('');
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
    <div className={cn("bg-deep-space rounded-2xl shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="p-3 border-b border-white/10 flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-white" />
          <h3 className="font-bold text-sm">Symptoms</h3>
        </div>
        {isListening && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-300 uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3 h-3" />
            AI Listening
          </div>
        )}
      </div>
      
      <div className="p-3 space-y-3 flex-1 overflow-y-auto bg-white">
        <ul className="space-y-2">
          {symptoms.map((sym) => (
            <li key={sym.id} className="flex items-center gap-2 text-sm text-deep-space bg-gray-50 px-3 py-2 rounded-lg group animate-in fade-in slide-in-from-right-2">
              {sym.isAi ? (
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-deep-space shrink-0 ml-1 mr-1" />
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
                  <span className={cn("flex-1", sym.isAi && "text-purple-900")}>{sym.text}</span>
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
          {isListening && (
            <li className="flex items-center gap-2 text-sm text-gray-400 px-3 py-2">
              <span className="flex h-1.5 w-1.5 relative ml-1 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-500"></span>
              </span>
              <span className="animate-pulse">Typing from live speech...</span>
            </li>
          )}
        </ul>

        {/* Manual Input */}
        <form onSubmit={addManual} className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
          <input
            type="text"
            value={newSymptom}
            onChange={(e) => setNewSymptom(e.target.value)}
            placeholder="Add manually..."
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
