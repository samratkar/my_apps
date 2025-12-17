import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Paper, ResearchResponse } from "../types";

const researchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    area: { type: Type.STRING, description: "The normalized research area name" },
    papers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Full title of the paper" },
          authors: { type: Type.STRING, description: "Lead authors (e.g., 'Smith, J. et al.')" },
          journal: { type: Type.STRING, description: "Journal or Conference name" },
          year: { type: Type.STRING, description: "Publication year" },
          citations: { type: Type.STRING, description: "Approximate citation count (e.g., '1500+')" },
          abstract: { type: Type.STRING, description: "A concise 2-3 sentence summary of the paper's abstract" },
          keyFindings: { type: Type.STRING, description: "One key contribution or finding of this paper" }
        },
        required: ["title", "authors", "journal", "year", "abstract", "keyFindings"],
      },
    },
  },
  required: ["area", "papers"],
};

export const fetchPapersByArea = async (area: string, apiKey: string, paperCount: number = 20): Promise<ResearchResponse> => {
  if (!apiKey) {
    throw new Error('API key is required');
  }
  
  try {
    const genAI = new GoogleGenAI({ apiKey });
    const model = "gemini-2.0-flash";
    const prompt = `
      Act as an expert academic researcher.
      
      I need a comprehensive list of exactly ${paperCount} important academic papers in the research area of: "${area}".
      
      Criteria:
      1. Select ${paperCount} papers that define the field (a mix of seminal "classic" papers and high-impact recent breakthroughs).
      2. Ensure they are from reputable Q1/Q2 journals or top-tier conferences.
      3. For each paper, provide the title, authors, journal, year, citation count estimate, a summary (abstract), and the key finding.
      
      Output strictly in JSON format matching the schema. Ensure the list contains ${paperCount} items.
    `;

    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: researchSchema,
        temperature: 0.4,
      },
    });

    if (!response.text) {
      throw new Error("No data received from Gemini.");
    }

    const data = JSON.parse(response.text) as ResearchResponse;
    return data;
  } catch (error: any) {
    console.error("Error fetching papers:", error);
    // Re-throw with more specific message
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('invalid')) {
      throw new Error('API key invalid');
    }
    throw error;
  }
};
