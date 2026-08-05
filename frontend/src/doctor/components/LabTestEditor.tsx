import React, { useState, useEffect, useRef } from 'react';
import { TestTube, X, Sparkles, Plus, Edit2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { searchCatalog } from '../data/prescriptionCatalog';

interface LabTest {
  id: string;
  text: string;
  isAi: boolean;
  isEditing?: boolean;
}

interface LabTestEditorProps {
  className?: string;
}

const LabTestEditor: React.FC<LabTestEditorProps> = ({ className }) => {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [newTest, setNewTest] = useState('');
  const [isListening, setIsListening] = useState(true);
  const [editText, setEditText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = searchCatalog('LAB_TEST', newTest);

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
    const t1 = setTimeout(() => setTests(prev => [...prev, { id: '1', text: 'Complete Blood Count (CBC)', isAi: true }]), 3500);
    const t2 = setTimeout(() => setTests(prev => [...prev, { id: '2', text: 'Dengue NS1 Antigen', isAi: true }]), 7500);
    const t3 = setTimeout(() => setIsListening(false), 9000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const addManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTest.trim()) {
      setTests([...tests, { id: Date.now().toString(), text: newTest.trim(), isAi: false }]);
      setNewTest('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setNewTest(suggestion);
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

  const removeTest = (id: string) => {
    setTests(tests.filter(t => t.id !== id));
  };

  const startEdit = (test: LabTest) => {
    setTests(tests.map(t => t.id === test.id ? { ...t, isEditing: true } : t));
    setEditText(test.text);
  };

  const saveEdit = (id: string) => {
    if (editText.trim()) {
      setTests(tests.map(t => t.id === id ? { ...t, text: editText.trim(), isEditing: false } : t));
    } else {
      removeTest(id);
    }
  };

  return (
    <div className={cn("bg-deep-space rounded-2xl shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="p-3 border-b border-white/10 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TestTube className="w-4 h-4 text-white" />
            <h3 className="font-bold text-sm">Lab Tests</h3>
          </div>
          {isListening && (
            <div className="flex items-center gap-1.5 text-xs text-orange-200 bg-white/10 px-2.5 py-0.5 rounded-full font-medium">
              <span className="flex h-1.5 w-1.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-300"></span>
              </span>
              <span className="animate-pulse text-[11px] font-normal">Analyzing symptoms for tests...</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const aiItem = { id: Date.now().toString(), text: 'Dengue NS1 Antigen & CBC Test', isAi: true };
              setTests(prev => [...prev, aiItem]);
            }}
            className="flex items-center gap-1.5 text-[10px] font-bold text-orange-300 uppercase tracking-wider hover:text-white transition-colors cursor-pointer bg-white/10 px-2 py-0.5 rounded-full"
            title="Click to trigger AI auto-extraction"
          >
            <Sparkles className="w-3 h-3" />
            AI Listening
          </button>
        </div>
      </div>
      
      <div className="p-3 flex-1 min-h-0 overflow-y-auto bg-white">
        <ul className="space-y-2">
          {tests.map((test) => (
            <li key={test.id} className="flex items-center gap-2 text-sm text-deep-space bg-gray-50 px-3 py-2 rounded-lg group animate-in fade-in slide-in-from-right-2">
              {test.isAi ? (
                <Sparkles className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 ml-1 mr-1" />
              )}
              
              {test.isEditing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(test.id)}
                    className="flex-1 text-sm bg-white border border-orange-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button onClick={() => saveEdit(test.id)} className="text-green-600 hover:text-green-700">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className={cn("flex-1", test.isAi && "text-orange-900")}>{test.text}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                    <button onClick={() => startEdit(test)} className="text-gray-400 hover:text-blue-500 p-1">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => removeTest(test.id)} className="text-gray-400 hover:text-red-500 p-1">
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
            <div className="bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-700 uppercase tracking-wider flex justify-between items-center">
              <span>Suggested Lab Tests</span>
              <span className="text-[10px] text-orange-500 font-normal">Click or press Tab/Enter to select</span>
            </div>
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className={cn(
                  "w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-900 transition-colors flex items-center gap-2 cursor-pointer",
                  selectedIndex === idx && "bg-orange-100 text-orange-900 font-medium"
                )}
              >
                <TestTube className="w-3 h-3 text-orange-500 shrink-0" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={addManual} className="flex gap-2">
          <input
            type="text"
            value={newTest}
            onChange={(e) => {
              setNewTest(e.target.value);
              setShowSuggestions(true);
              setSelectedIndex(-1);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Add manually (e.g. CBC, Dengue)..."
            className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-habanero"
          />
          <button 
            type="submit"
            disabled={!newTest.trim()}
            className="w-9 h-9 shrink-0 bg-gray-100 text-deep-space hover:bg-gray-200 disabled:opacity-50 rounded-lg flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LabTestEditor;
