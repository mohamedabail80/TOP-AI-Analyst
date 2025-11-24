import React, { useState } from 'react';
import { HistoryItem } from '../types';

interface HistoryListProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClose: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onDelete, onClose }) => {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (val: number) => `$${(val || 0).toFixed(2)}`;

  // Sort history based on selection
  const sortedHistory = [...history].sort((a, b) => {
    return sortOrder === 'newest' 
      ? b.timestamp - a.timestamp 
      : a.timestamp - b.timestamp;
  });

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-lg font-medium">No history yet</p>
        <p className="text-sm">Run an analysis to save it automatically.</p>
        <button onClick={onClose} className="mt-6 text-indigo-400 hover:text-indigo-300">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-4">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Analysis History
        </h2>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 relative">
            <span className="text-xs text-slate-400 uppercase font-bold">Sort:</span>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-transparent text-sm text-white focus:outline-none cursor-pointer appearance-none pr-6"
            >
              <option value="newest" className="bg-slate-800 text-white">Newest First</option>
              <option value="oldest" className="bg-slate-800 text-white">Oldest First</option>
            </select>
            <svg className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            Close
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {sortedHistory.map((item) => {
           // Safe destructuring with defaults
           const summary = item.result?.summary || { netProfit: 0, totalRoi: 0, totalCost: 0, totalRevenue: 0 };
           const details = item.result?.details || [];
           const badCountries = item.result?.badCountries || [];

           return (
            <div 
              key={item.id}
              onClick={() => onSelect(item)}
              className="bg-slate-800 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-4 cursor-pointer transition-all hover:bg-slate-750 group relative"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-slate-400 text-xs mb-1 font-mono">{formatDate(item.timestamp)}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div>
                      <span className="text-slate-500 text-xs uppercase block">Net Profit</span>
                      <span className={`text-lg font-bold ${summary.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(summary.netProfit)}
                      </span>
                    </div>
                    <div className="w-px h-8 bg-slate-700"></div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase block">ROI</span>
                      <span className={`text-lg font-bold ${summary.totalRoi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {summary.totalRoi.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-px h-8 bg-slate-700"></div>
                    <div>
                      <span className="text-slate-500 text-xs uppercase block">Countries</span>
                      <span className="text-lg font-bold text-slate-200">
                        {details.length}
                      </span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={(e) => onDelete(item.id, e)}
                  className="text-slate-600 hover:text-red-400 p-2 rounded-full hover:bg-slate-700 transition-colors z-10"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              
              <div className="mt-3 flex gap-2">
                {badCountries.slice(0, 3).map(country => (
                  <span key={country} className="text-xs bg-red-900/30 text-red-300 px-2 py-0.5 rounded border border-red-900/50">
                    Block: {country}
                  </span>
                ))}
                {badCountries.length > 3 && (
                  <span className="text-xs text-slate-500 py-0.5">+{badCountries.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HistoryList;