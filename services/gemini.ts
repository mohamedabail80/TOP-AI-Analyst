import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

// Ensure API key is present
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Analyzes two images (Cost vs Revenue) using Gemini 3 Pro with Thinking Mode.
 * This handles the complex logic of matching rows between two different screenshot formats.
 */
export const analyzeArbitrageImages = async (
  propellerImgBase64: string,
  kadamImgBase64: string,
  propellerMime: string,
  kadamMime: string
): Promise<AnalysisResult> => {
  if (!API_KEY) throw new Error("API Key is missing.");

  // Using gemini-3-pro-preview
  const modelId = "gemini-3-pro-preview";

  const prompt = `
    You are an expert Ad Tech Data Analyst. I have provided two images.
    
    Image 1 (First image): A screenshot from PropellerAds showing COST/SPEND data by country (or zone). It likely contains columns for 'Impressions', 'CPM', and 'Cost'.
    Image 2 (Second image): A screenshot from Kadam showing REVENUE/EARNINGS data.

    Your task is to:
    1. Extract the table data from both images. 
    2. Match the data based on 'Country' (e.g., IN, US, ID) or 'Zone ID' if visible.
    3. Convert all country codes (e.g., 'IN', 'US', 'ID') into their FULL English country names (e.g., 'India', 'United States', 'Indonesia').
    4. Calculate the Profit/Loss for each matching entity (Revenue - Cost).
    5. Identify 'Bad Countries' where the Loss is significant or ROI is very negative.
    6. Provide a JSON output summarizing this financial performance.

    If exact matches aren't found, do your best to estimate based on visible text. 
    Ignore rows that clearly don't match.

    IMPORTANT: You must return ONLY valid JSON. 
    Do not wrap the JSON in markdown code blocks (like \`\`\`json). 
    Do not include any conversational text before or after the JSON.
    
    The JSON must follow this structure:
    {
      "summary": { "totalCost": number, "totalRevenue": number, "netProfit": number, "totalRoi": number },
      "details": [
        { 
          "country": "string (Full Country Name, e.g. India)", 
          "cost": number, 
          "revenue": number, 
          "profit": number, 
          "roi": number, 
          "status": "PROFITABLE" | "LOSS" | "BREAK_EVEN" 
        }
      ],
      "badCountries": ["string array of full country names to block"],
      "recommendations": ["string array of actionable advice"]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: propellerImgBase64,
              mimeType: propellerMime
            }
          },
          {
            inlineData: {
              data: kadamImgBase64,
              mimeType: kadamMime
            }
          }
        ]
      },
      config: {
        // Reduced from 32768 to 16000 to prevent browser XHR timeouts while still providing deep thinking.
        thinkingConfig: { thinkingBudget: 16000 },
        // Do NOT use responseMimeType: "application/json" with Thinking + Vision in preview, it can cause 500 errors.
      }
    });

    let text = response.text || "{}";
    
    // Clean up markdown if model adds it despite instructions
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // Locate the JSON object
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      text = text.substring(start, end + 1);
    } else {
      throw new Error("Invalid JSON response format from Gemini");
    }

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Analysis failed:", error);
    // Provide a more helpful error message based on the error type
    if (JSON.stringify(error).includes("code: 6") || JSON.stringify(error).includes("xhr error")) {
       throw new Error("Connection failed. The images might be too large or the analysis took too long. Please try again with clearer or cropped screenshots.");
    }
    throw new Error("Failed to analyze images. Please ensure screenshots are clear and try again.");
  }
};