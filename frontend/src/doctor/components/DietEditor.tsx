import React, { useState, useEffect } from 'react';
import { Apple, X, Sparkles, Plus, Edit2, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

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
        <div className="flex items-center gap-2">
          <Apple className="w-4 h-4 text-white" />
          <h3 className="font-bold text-sm">Diet & Lifestyle</h3>
        </div>
        {isListening && (
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-green-300 uppercase tracking-wider animate-pulse">
            <Sparkles className="w-3 h-3" />
            AI Listening
          </div>
        )}
      </div>
      
      <div className="p-3 space-y-3 flex-1 overflow-y-auto bg-white">
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
          {isListening && (
            <li className="flex items-center gap-2 text-sm text-gray-400 px-3 py-2">
              <span className="flex h-1.5 w-1.5 relative ml-1 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <span className="animate-pulse">Waiting for recommendations...</span>
            </li>
          )}
        </ul>

        {/* Manual Input */}
        <form onSubmit={addManual} className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
          <input
            type="text"
            value={newRec}
            onChange={(e) => setNewRec(e.target.value)}
            placeholder="Add manually..."
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
