import React from 'react';
import { Sparkles, AlertCircle, Info, Lightbulb } from 'lucide-react';
import type { AIInsightDTO } from '../../types';
import { cn } from '../../lib/utils';

interface AIInsightsPanelProps {
  insights: AIInsightDTO[];
  className?: string;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights, className }) => {
  const getIcon = (type: AIInsightDTO['type']) => {
    switch (type) {
      case 'SUGGESTION': return <Lightbulb className="w-4 h-4 text-blue-500" />;
      case 'WARNING': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'INFO': return <Info className="w-4 h-4 text-green-500" />;
    }
  };

  const getBgColor = (type: AIInsightDTO['type']) => {
    switch (type) {
      case 'SUGGESTION': return 'bg-blue-50 border-blue-100';
      case 'WARNING': return 'bg-red-50 border-red-100';
      case 'INFO': return 'bg-green-50 border-green-100';
    }
  };

  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden", className)}>
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h3 className="font-bold text-deep-space">AI Insights</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {insights.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-4 text-center">
            <Sparkles className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Listening to consultation to generate insights...</p>
          </div>
        ) : (
          insights.map((insight) => (
            <div 
              key={insight.id}
              className={cn("p-3 rounded-xl border flex gap-3 animate-in fade-in slide-in-from-right-4", getBgColor(insight.type))}
            >
              <div className="mt-0.5 shrink-0">
                {getIcon(insight.type)}
              </div>
              <div>
                <p className="text-sm text-deep-space">{insight.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Confidence</span>
                  <div className="w-16 h-1.5 bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${insight.confidence}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">{insight.confidence}%</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AIInsightsPanel;
