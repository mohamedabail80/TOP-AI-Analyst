export interface CountryData {
  country: string;
  cost: number;
  revenue: number;
  profit: number;
  roi: number; // Return on Investment %
  status: 'PROFITABLE' | 'LOSS' | 'BREAK_EVEN';
}

export interface AnalysisResult {
  summary: {
    totalCost: number;
    totalRevenue: number;
    netProfit: number;
    totalRoi: number;
  };
  details: CountryData[];
  badCountries: string[]; // List of countries to block
  recommendations: string[];
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  result: AnalysisResult;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR',
  HISTORY = 'HISTORY'
}

// Helper for file handling
export interface UploadedFile {
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
  label: 'PropellerAds (Cost)' | 'Kadam (Revenue)';
}