import React, { useState, useMemo } from 'react';
import { AnalysisResult } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import html2canvas from 'html2canvas';

interface DashboardProps {
  data: AnalysisResult;
  onReset: () => void;
  onDataUpdate: (newData: AnalysisResult) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onReset, onDataUpdate }) => {
  const [hiddenCountries, setHiddenCountries] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Safety check for details array
  const details = data?.details || [];
  const badCountries = data?.badCountries || [];
  const recommendations = data?.recommendations || [];

  const visibleData = useMemo(() => {
    return details.filter(d => !hiddenCountries.includes(d.country));
  }, [details, hiddenCountries]);

  const summary = useMemo(() => {
    // Safety check for summary object
    const rawSummary = data?.summary || { totalCost: 0, totalRevenue: 0, netProfit: 0, totalRoi: 0 };

    if (hiddenCountries.length === 0) return rawSummary;

    const totalCost = visibleData.reduce((sum, item) => sum + (item.cost || 0), 0);
    const totalRevenue = visibleData.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const netProfit = totalRevenue - totalCost;
    const totalRoi = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;

    return { totalCost, totalRevenue, netProfit, totalRoi };
  }, [visibleData, hiddenCountries.length, data?.summary]);

  const toggleVisibility = (country: string) => {
    setHiddenCountries(prev => 
      prev.includes(country) 
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    const element = document.getElementById('dashboard-content');
    if (!element) {
      setIsDownloading(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
        logging: false
      });

      const link = document.createElement('a');
      link.download = `AdArbitrage-Report-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error("Screenshot failed:", error);
      alert("Failed to generate image.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadHtml = () => {
    const jsonPayload = JSON.stringify({
        details: details,
        badCountries: badCountries,
        recommendations: recommendations,
        summary: data?.summary || { totalCost: 0, totalRevenue: 0, netProfit: 0, totalRoi: 0 },
        generatedAt: new Date().toLocaleString()
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AdArbitrage Interactive Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { background-color: #0f172a; color: #e2e8f0; font-family: 'Inter', sans-serif; }
        .profit-pos { color: #10b981; }
        .profit-neg { color: #ef4444; }
        .hidden { display: none !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
    </style>
</head>
<body class="p-8 max-w-6xl mx-auto">
    <div class="mb-8 border-b border-slate-700 pb-4 flex justify-between items-end">
        <div>
            <h1 class="text-3xl font-bold text-white">Analysis Report</h1>
            <p class="text-slate-400 mt-1" id="date-label">Generated on...</p>
        </div>
        <div class="text-right text-xs text-slate-500">AdArbitrage AI (Offline Mode)</div>
    </div>
    <div id="hidden-banner" class="hidden mb-6 bg-slate-800 border border-slate-600 rounded-lg p-3 flex flex-wrap items-center gap-2">
        <span class="text-slate-400 text-sm mr-2">Hidden Countries:</span>
        <div id="hidden-chips" class="flex flex-wrap gap-2"></div>
        <button onclick="app.showAll()" class="text-xs text-indigo-400 hover:text-indigo-300 ml-auto font-medium cursor-pointer">Show All</button>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <p class="text-slate-400 text-xs uppercase tracking-wider">Total Cost</p>
            <p class="text-2xl font-bold text-red-400" id="sum-cost">...</p>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <p class="text-slate-400 text-xs uppercase tracking-wider">Total Revenue</p>
            <p class="text-2xl font-bold text-emerald-400" id="sum-rev">...</p>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <p class="text-slate-400 text-xs uppercase tracking-wider">Net Profit</p>
            <p class="text-2xl font-bold" id="sum-profit">...</p>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <p class="text-slate-400 text-xs uppercase tracking-wider">Total ROI</p>
            <p class="text-2xl font-bold" id="sum-roi">...</p>
        </div>
    </div>
    <div class="grid md:grid-cols-2 gap-6 mb-8">
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 class="font-bold text-white mb-4 flex items-center gap-2 text-lg">
                <span class="text-red-500">⚠</span> Bad Countries (Block List)
            </h3>
            <div id="bad-countries-list" class="flex flex-wrap gap-2"></div>
        </div>
        <div class="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 class="font-bold text-white mb-4 text-lg">Recommendations</h3>
            <ul id="rec-list" class="list-disc list-inside text-sm text-slate-300 space-y-2"></ul>
        </div>
    </div>
    <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div class="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between">
            <h3 class="font-semibold text-white">Detailed Breakdown</h3>
            <span class="text-xs text-slate-400" id="row-count"></span>
        </div>
        <table class="w-full text-left text-sm text-slate-400">
            <thead class="bg-slate-900 text-slate-200 uppercase font-medium">
                <tr>
                    <th class="px-6 py-3">Country</th>
                    <th class="px-6 py-3">Cost</th>
                    <th class="px-6 py-3">Revenue</th>
                    <th class="px-6 py-3">Profit</th>
                    <th class="px-6 py-3">ROI</th>
                    <th class="px-6 py-3">Status</th>
                    <th class="px-6 py-3 text-right">Actions</th>
                </tr>
            </thead>
            <tbody id="table-body" class="divide-y divide-slate-700"></tbody>
        </table>
    </div>
    <script>
        const DATA = ${jsonPayload};
        const app = {
            hidden: [],
            init: function() {
                document.getElementById('date-label').textContent = 'Generated on ' + DATA.generatedAt;
                const recList = document.getElementById('rec-list');
                (DATA.recommendations || []).forEach(r => {
                    const li = document.createElement('li');
                    li.textContent = r;
                    recList.appendChild(li);
                });
                this.render();
            },
            formatMoney: function(n) { return '$' + (n || 0).toFixed(2); },
            render: function() {
                const visible = (DATA.details || []).filter(d => !this.hidden.includes(d.country));
                const tCost = visible.reduce((s, i) => s + (i.cost || 0), 0);
                const tRev = visible.reduce((s, i) => s + (i.revenue || 0), 0);
                const profit = tRev - tCost;
                const roi = tCost > 0 ? (profit / tCost) * 100 : 0;
                document.getElementById('sum-cost').textContent = this.formatMoney(tCost);
                document.getElementById('sum-rev').textContent = this.formatMoney(tRev);
                const pEl = document.getElementById('sum-profit');
                pEl.textContent = this.formatMoney(profit);
                pEl.className = 'text-2xl font-bold ' + (profit >= 0 ? 'profit-pos' : 'profit-neg');
                const rEl = document.getElementById('sum-roi');
                rEl.textContent = roi.toFixed(1) + '%';
                rEl.className = 'text-2xl font-bold ' + (roi >= 0 ? 'profit-pos' : 'profit-neg');
                const banner = document.getElementById('hidden-banner');
                const chips = document.getElementById('hidden-chips');
                chips.innerHTML = '';
                if (this.hidden.length > 0) {
                    banner.classList.remove('hidden');
                    this.hidden.forEach(c => {
                        const btn = document.createElement('button');
                        btn.className = 'bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer';
                        btn.innerHTML = c + ' &times;';
                        btn.onclick = () => this.toggle(c);
                        chips.appendChild(btn);
                    });
                } else {
                    banner.classList.add('hidden');
                }
                const badContainer = document.getElementById('bad-countries-list');
                badContainer.innerHTML = '';
                const visibleBad = (DATA.badCountries || []).filter(c => !this.hidden.includes(c));
                if (visibleBad.length) {
                    visibleBad.forEach(c => {
                        const s = document.createElement('span');
                        s.className = 'px-2 py-1 bg-red-900/50 border border-red-500/30 text-red-200 text-sm font-bold rounded';
                        s.textContent = c;
                        badContainer.appendChild(s);
                    });
                } else {
                    badContainer.innerHTML = '<span class="text-slate-500 text-sm">No significant losses in visible data.</span>';
                }
                document.getElementById('row-count').textContent = 'Showing ' + visible.length + ' entries';
                const tbody = document.getElementById('table-body');
                tbody.innerHTML = visible.map(row => {
                    const statusClass = row.status === 'PROFITABLE' ? 'bg-emerald-900 text-emerald-300' :
                                      row.status === 'LOSS' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300';
                    const profitClass = row.profit >= 0 ? 'profit-pos' : 'profit-neg';
                    const roiClass = row.roi >= 0 ? 'profit-pos' : 'profit-neg';
                    return \`
                    <tr class="hover:bg-slate-700/50">
                        <td class="px-6 py-4 font-medium text-white">\${row.country}</td>
                        <td class="px-6 py-4">\${this.formatMoney(row.cost)}</td>
                        <td class="px-6 py-4">\${this.formatMoney(row.revenue)}</td>
                        <td class="px-6 py-4 font-bold \${profitClass}">\${this.formatMoney(row.profit)}</td>
                        <td class="px-6 py-4 \${roiClass}">\${(row.roi || 0).toFixed(1)}%</td>
                        <td class="px-6 py-4"><span class="px-2 py-1 rounded text-xs font-bold \${statusClass}">\${row.status}</span></td>
                        <td class="px-6 py-4 text-right">
                             <button onclick="app.toggle('\${row.country}')" class="text-slate-500 hover:text-red-400 cursor-pointer" title="Hide">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                             </button>
                        </td>
                    </tr>\`;
                }).join('');
            },
            toggle: function(country) {
                if (this.hidden.includes(country)) {
                    this.hidden = this.hidden.filter(c => c !== country);
                } else {
                    this.hidden.push(country);
                }
                this.render();
            },
            showAll: function() {
                this.hidden = [];
                this.render();
            }
        };
        app.init();
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AdArbitrage-Interactive-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AdArbitrage-Data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (val: number) => `$${(val || 0).toFixed(2)}`;

  const visibleBadCountries = badCountries.filter(c => !hiddenCountries.includes(c));

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold text-slate-100">Analysis Report</h2>

        <div className="flex flex-wrap gap-2 justify-center">
          
          <div className="flex gap-2 mr-2 border-r border-slate-700 pr-4">
            <button 
              onClick={handleDownloadJson}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg transition-colors flex items-center gap-2 border border-slate-700 text-sm"
              title="Download Raw JSON Data"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              JSON
            </button>
          </div>

          <button 
            onClick={handleDownloadHtml}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 border border-slate-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Save HTML
          </button>
          
          <button 
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Save Image
              </>
            )}
          </button>
          <button 
            onClick={onReset}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            New
          </button>
        </div>
      </div>

      {/* Capture Area Wrapper */}
      <div id="dashboard-content" className="space-y-6 bg-slate-900 p-2 rounded-xl">
        
        {/* Hidden Items Banner */}
        {hiddenCountries.length > 0 && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 flex flex-wrap items-center gap-2 animate-fadeIn">
            <span className="text-slate-400 text-sm mr-2">Hidden Countries:</span>
            {hiddenCountries.map(country => (
              <button
                key={country}
                onClick={() => toggleVisibility(country)}
                className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors"
              >
                {country}
                <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            ))}
            <button 
              onClick={() => setHiddenCountries([])}
              className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto font-medium"
            >
              Show All
            </button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm uppercase tracking-wider">Total Cost</p>
            <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.totalCost)}</p>
            <p className="text-xs text-slate-500 mt-1">PropellerAds</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(summary.totalRevenue)}</p>
            <p className="text-xs text-slate-500 mt-1">Kadam</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm uppercase tracking-wider">Net Profit</p>
            <p className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {formatCurrency(summary.netProfit)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Difference</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm uppercase tracking-wider">Total ROI</p>
            <p className={`text-2xl font-bold ${summary.totalRoi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {summary.totalRoi.toFixed(2)}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Return on Investment</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-semibold mb-4 text-white">Profit by Country</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visibleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="country" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f1f5f9' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                  />
                  <Legend />
                  <Bar dataKey="profit" name="Net Profit ($)">
                    {visibleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Actionable Insights */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col">
            <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Bad Countries (Block List)
            </h3>
            <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-200 mb-2">Add these to your blacklist immediately:</p>
              <div className="flex flex-wrap gap-2">
                {visibleBadCountries.length > 0 ? (
                  visibleBadCountries.map(country => (
                    <span key={country} className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                      {country}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-500 text-sm">No significant losses detected in visible data.</span>
                )}
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-2 mt-2 text-white">Recommendations</h3>
            <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 overflow-y-auto max-h-40">
              {recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Detailed Breakdown</h3>
            <div className="text-xs text-slate-400">
              Showing {visibleData.length} entries
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-900 text-slate-200 uppercase font-medium">
                <tr>
                  <th className="px-6 py-3">Country</th>
                  <th className="px-6 py-3">Cost</th>
                  <th className="px-6 py-3">Revenue</th>
                  <th className="px-6 py-3">Profit</th>
                  <th className="px-6 py-3">ROI</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {visibleData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white">{row.country}</td>
                    <td className="px-6 py-4">{formatCurrency(row.cost)}</td>
                    <td className="px-6 py-4">{formatCurrency(row.revenue)}</td>
                    <td className={`px-6 py-4 font-bold ${row.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(row.profit)}
                    </td>
                    <td className={`px-6 py-4 ${row.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {row.roi.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        row.status === 'PROFITABLE' ? 'bg-emerald-900 text-emerald-300' :
                        row.status === 'LOSS' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleVisibility(row.country)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        title="Hide country"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;