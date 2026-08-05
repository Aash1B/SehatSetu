import React, { useState, useEffect, useRef } from 'react';
import { Apple, X, Sparkles, Plus, Edit2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { searchCatalog } from '../data/prescriptionCatalog';

interface DietRec {
  id: string;
  text: string;
  isAi: boolean;
  isEditing?: boolean;
}

interface DietEditorProps {
  className?: string;
}

const DietEditor: React.FC<DietEditorProps> = ({ className }) => {
  const [recommendations, setRecommendations] = useState<DietRec[]>([]);
  const [newRec, setNewRec] = useState('');
  const [isListening, setIsListening] = useState(true);
  const [editText, setEditText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = searchCatalog('DIET_LIFESTYLE', newRec);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Simulate live transcription
  useEffect(() => {
    const t1 = setTimeout(() => setRecommendations(prev => [...prev, { id: '1', text: 'Increase fluid intake (min 3L/day)', isAi: true }]), 5000);
    const t2 = setTimeout(() => setRecommendations(prev => [...prev, { id: '2', text: 'Avoid spicy and oily foods', isAi: true }]), 10000);
    const t3 = setTimeout(() => setIsListening(false), 11500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRec.trim()) {
      setRecommendations([...recommendations, { id: Date.now().toString(), text: newRec.trim(), isAi: false }]);
      setNewRec('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setNewRec(suggestion);
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

  const removeRec = (id: string) => {
    setRecommendations(recommendations.filter(r => r.id !== id));
  };

  const startEdit = (rec: DietRec) => {
    setRecommendations(recommendations.map(r => r.id === rec.id ? { ...r, isEditing: true } : r));
    setEditText(rec.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      setRecommendations(recommendations.map(r => r.id === id ? { ...r, text: editText.trim(), isEditing: false } : r));
    } else {
      removeRec(id);
    }
  };

  return (
    <div className={cn("bg-deep-space rounded-2xl shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="p-3 border-b border-white/10 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Apple className="w-4 h-4 text-white" />
            <h3 className="font-bold text-sm">Diet & Lifestyle</h3>
          </div>
          {isListening && (
            <div className="flex items-center gap-1.5 text-xs text-green-200 bg-white/10 px-2.5 py-0.5 rounded-full font-medium">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-300"></span>
              </span>
              <span className="animate-pulse text-[11px] font-normal">Waiting for recommendations...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const aiItem = { id: Date.now().toString(), text: 'Low sodium diet & hydration with 3L water daily', isAi: true };
              setRecommendations(prev => [...prev, aiItem]);
            }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-green-300 uppercase tracking-wider hover:text-white transition-colors cursor-pointer bg-white/10 px-2 py-0.5 rounded-full"
            title="Click to trigger AI auto-extraction"
          >
            <Sparkles className="w-3 h-3" />
            AI Listening
          </button>
        </div>
      </div>
      
      <div className="p-3 flex-1 min-h-0 overflow-y-auto bg-white">
        <ul className="space-y-2">
          {recommendations.map((rec) => (
            <li key={rec.id} className="flex items-center gap-2 text-sm text-deep-space bg-gray-50 px-3 py-2 rounded-lg group animate-in fade-in slide-in-from-right-2">
              {rec.isAi ? (
                <Sparkles className="w-3.5 h-3.5 text-green-400 shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 ml-1 mr-1" />
              )}
              
              {rec.isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(rec.id)}
                    className="flex-1 text-sm bg-white border border-green-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                  <button onClick={() => saveEdit(rec.id)} className="text-green-600 hover:text-green-700">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className={cn("flex-1", rec.isAi && "text-green-900")}>{rec.text}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => startEdit(rec)} className="text-gray-400 hover:text-blue-500 p-1">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeRec(rec.id)} className="text-gray-400 hover:text-red-500 p-1">
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
            <div className="bg-green-50 px-3 py-1.5 text-[11px] font-semibold text-green-700 uppercase tracking-wider flex justify-between items-center">
              <span>Suggested Diet & Lifestyle</span>
              <span className="text-[10px] text-green-500 font-normal">Click or press Tab/Enter to select</span>
            </div>
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-green-50 hover:text-green-900 transition-colors flex items-center gap-2 cursor-pointer",
                  selectedIndex === idx && "bg-green-100 text-green-900 font-medium"
                )}
              >
                <Apple className="w-3 h-3 text-green-500 shrink-0" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={addManual} className="flex gap-2">
          <input
            type="text"
            value={newRec}
            onChange={(e) => {
              setNewRec(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Add manually (e.g. Low salt, Fluid intake)..."
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-habanero"
          />
          <button 
            type="submit"
            disabled={!newRec.trim()}
            className="w-9 h-9 shrink-0 bg-gray-100 text-deep-space hover:bg-gray-200 disabled:opacity-50 rounded-lg flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default DietEditor;
