import React, { useState, useEffect } from 'react';
import { TestTube, X, Sparkles, Plus, Edit2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

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
        <div className="flex items-center gap-2">
          <TestTube className="w-4 h-4 text-white" />
          <h3 className="font-bold text-sm">Lab Tests</h3>
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
      
      <div className="p-3 space-y-3 flex-1 overflow-y-auto bg-white">
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
          {isListening && (
            <li className="flex items-center gap-2 text-sm text-gray-400 px-3 py-2">
              <span className="flex h-1.5 w-1.5 relative ml-1 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
              </span>
              <span className="animate-pulse">Analyzing symptoms for tests...</span>
            </li>
          )}
        </ul>

        {/* Manual Input */}
        <form onSubmit={addManual} className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
          <input
            type="text"
            value={newTest}
            onChange={(e) => setNewTest(e.target.value)}
            placeholder="Add manually..."
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
