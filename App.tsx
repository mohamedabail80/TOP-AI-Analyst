import React, { useState, useEffect, useRef } from 'react';
import { AppState, UploadedFile, AnalysisResult, HistoryItem, CountryData } from './types';
import ImageUploader from './components/ImageUploader';
import Dashboard from './components/Dashboard';
import HistoryList from './components/HistoryList';
import { analyzeArbitrageImages } from './services/gemini';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [propellerFile, setPropellerFile] = useState<UploadedFile | null>(null);
  const [kadamFile, setKadamFile] = useState<UploadedFile | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history from local storage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('ad_arbitrage_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveToHistory = (data: AnalysisResult) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      result: data
    };
    
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('ad_arbitrage_history', JSON.stringify(updatedHistory));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedHistory = history.filter(item => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('ad_arbitrage_history', JSON.stringify(updatedHistory));
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setResult(item.result);
    setAppState(AppState.RESULTS);
  };

  const handleAnalyze = async () => {
    if (!propellerFile || !kadamFile) {
      setErrorMsg("Please upload both screenshots first.");
      return;
    }

    setAppState(AppState.ANALYZING);
    setErrorMsg('');

    try {
      const analysisData = await analyzeArbitrageImages(
        propellerFile.base64,
        kadamFile.base64,
        propellerFile.mimeType,
        kadamFile.mimeType
      );
      setResult(analysisData);
      saveToHistory(analysisData); // Auto-save to history
      setAppState(AppState.RESULTS);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "An unknown error occurred");
      setAppState(AppState.ERROR);
    }
  };

  const resetApp = () => {
    setAppState(AppState.UPLOAD);
    setPropellerFile(null);
    setKadamFile(null);
    setResult(null);
    setErrorMsg('');
  };

  // --- IMPORT / MERGE LOGIC ---
  const triggerImport = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      let importedData: AnalysisResult | null = null;

      if (file.name.endsWith('.json')) {
        importedData = JSON.parse(text);
      } else if (file.name.endsWith('.html')) {
        const match = text.match(/const DATA = ({.*?});/s);
        if (match && match[1]) {
           importedData = JSON.parse(match[1]);
        }
      }

      if (!importedData || !importedData.details) {
        alert("Invalid file format. Could not find analysis data.");
        return;
      }

      // Ensure optional fields exist
      if (!importedData.badCountries) importedData.badCountries = [];
      if (!importedData.recommendations) importedData.recommendations = [];

      // RECALCULATE SUMMARY IF MISSING
      // This fixes the issue where old reports without 'summary' show 0 totals
      if (!importedData.summary) {
        const d = importedData.details;
        const tc = d.reduce((acc: number, curr: any) => acc + (curr.cost || 0), 0);
        const tr = d.reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0);
        const np = tr - tc;
        const roi = tc > 0 ? (np / tc) * 100 : 0;
        
        importedData.summary = {
          totalCost: tc,
          totalRevenue: tr,
          netProfit: np,
          totalRoi: roi
        };
      }

      // If we already have results, MERGE. If not, just LOAD.
      if (result) {
        const mergedDetailsMap = new Map<string, CountryData>();

        // 1. Add current data
        result.details.forEach(item => mergedDetailsMap.set(item.country, { ...item }));

        // 2. Merge imported data
        importedData.details.forEach(newItem => {
          if (mergedDetailsMap.has(newItem.country)) {
            const existing = mergedDetailsMap.get(newItem.country)!;
            existing.cost += newItem.cost;
            existing.revenue += newItem.revenue;
            existing.profit = existing.revenue - existing.cost;
            existing.roi = existing.cost > 0 ? (existing.profit / existing.cost) * 100 : 0;
            existing.status = existing.profit > 0 ? 'PROFITABLE' : existing.profit < -0.5 ? 'LOSS' : 'BREAK_EVEN';
          } else {
            mergedDetailsMap.set(newItem.country, { ...newItem });
          }
        });

        const mergedDetails = Array.from(mergedDetailsMap.values());
        const totalCost = mergedDetails.reduce((s, i) => s + i.cost, 0);
        const totalRevenue = mergedDetails.reduce((s, i) => s + i.revenue, 0);
        const netProfit = totalRevenue - totalCost;
        const totalRoi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

        const badCountries = Array.from(new Set([...result.badCountries, ...(importedData.badCountries || [])]));
        const recommendations = Array.from(new Set([...result.recommendations, ...(importedData.recommendations || [])]));

        const mergedResult: AnalysisResult = {
          summary: { totalCost, totalRevenue, netProfit, totalRoi },
          details: mergedDetails,
          badCountries,
          recommendations
        };

        setResult(mergedResult);
        alert("Report merged successfully!");
      } else {
        // Just load the report
        setResult(importedData);
        setAppState(AppState.RESULTS);
      }

    } catch (err) {
      console.error(err);
      alert("Failed to load report. File might be corrupted.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="bg-slate-900/50 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer" 
            onClick={() => setAppState(AppState.UPLOAD)}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              AdArbitrage AI
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Hidden Import Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json,.html" 
              onChange={handleImportFile} 
            />
            
            <button 
              onClick={triggerImport}
              className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2"
              title="Upload existing .json or .html report"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Import Report
            </button>

            <div className="h-4 w-px bg-slate-700"></div>

            <button 
              onClick={() => setAppState(AppState.HISTORY)}
              className={`text-sm font-medium transition-colors ${appState === AppState.HISTORY ? 'text-indigo-400' : 'text-slate-400 hover:text-white'}`}
            >
              History
            </button>
            <div className="h-4 w-px bg-slate-700 hidden sm:block"></div>
            <div className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-slate-700 hidden sm:block">
              Powered by Gemini 3 Pro
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {appState === AppState.UPLOAD && (
          <div className="flex-1 flex flex-col items-center justify-center p-4 animate-fadeIn">
            <div className="max-w-4xl w-full space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                  Analyze Profit & Loss <br />
                  <span className="text-indigo-400">Instantly</span>
                </h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                  Upload your <strong>PropellerAds</strong> cost table and <strong>Kadam</strong> revenue table. 
                  Our AI will match countries, calculate ROI, and detect bad zones.
                </p>
                
                {/* Visible link for import in the main area as well */}
                <button 
                  onClick={triggerImport}
                  className="inline-flex items-center text-sm text-indigo-400 hover:text-indigo-300 mt-2"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  Or upload an existing report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <ImageUploader 
                  label="PropellerAds (Cost)" 
                  fileData={propellerFile} 
                  onFileSelect={setPropellerFile} 
                  color="red"
                />
                <ImageUploader 
                  label="Kadam (Revenue)" 
                  fileData={kadamFile} 
                  onFileSelect={setKadamFile} 
                  color="green"
                />
              </div>

              {errorMsg && (
                 <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg text-center">
                   {errorMsg}
                 </div>
              )}

              <div className="flex justify-center pt-8">
                <button
                  onClick={handleAnalyze}
                  disabled={!propellerFile || !kadamFile}
                  className={`
                    px-8 py-4 rounded-full font-bold text-lg shadow-2xl transition-all transform hover:scale-105
                    ${(!propellerFile || !kadamFile) 
                      ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-indigo-500/25'}
                  `}
                >
                  Analyze Screenshots
                </button>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.HISTORY && (
          <HistoryList 
            history={history}
            onSelect={loadHistoryItem}
            onDelete={deleteHistoryItem}
            onClose={() => setAppState(AppState.UPLOAD)}
          />
        )}

        {appState === AppState.ANALYZING && (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Gemini 3 Pro is Thinking...</h3>
            <p className="text-slate-400">Extracting data from images and calculating financial metrics.</p>
            <div className="mt-4 text-xs text-slate-600 font-mono">Thinking Budget: 16k tokens</div>
          </div>
        )}

        {(appState === AppState.RESULTS && result) && (
          <Dashboard 
            data={result} 
            onReset={resetApp} 
            onDataUpdate={setResult}
          />
        )}

        {(appState === AppState.ERROR) && (
           <div className="flex-1 flex flex-col items-center justify-center p-4">
             <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-2xl max-w-md text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Analysis Failed</h3>
                <p className="text-red-200 mb-6">{errorMsg || "Could not analyze the images."}</p>
                <button onClick={resetApp} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors">
                  Try Again
                </button>
             </div>
           </div>
        )}
      </main>
      
      <footer className="py-6 text-center text-slate-600 text-sm">
        &copy; {new Date().getFullYear()} AdArbitrage AI. Deployable on InfinityFree.
      </footer>
    </div>
  );
};

export default App;