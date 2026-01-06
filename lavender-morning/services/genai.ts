import { GoogleGenAI, Type } from "@google/genai";
import { TextResponse } from "../types";

export const generateMorningContent = async (
  apiKey: string,
  bookName: string,
  authorName: string
): Promise<{ textData: TextResponse; imageBase64: string; imageMimeType: string }> => {
  const ai = new GoogleGenAI({ apiKey });

  // 1. Generate Text Content (Quote + Calendar Info)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  const textPrompt = `
    Today is ${today}.
    I need a content JSON for a "Good Morning" card based on the book "${bookName}" (or by author "${authorName}" if book is unspecified).
    
    Please provide:
    1. A short, inspiring, or beautiful quote from this book/author suitable for a morning greeting.
    2. The correct Hindu Calendar date details for today (${today}) including Tithi, Paksha, Month, and Samvat. Format it nicely (e.g., "Pausha Krishna Dwitiya, Vikram Samvat 2081").
    3. A creative visual description of a scene, landscape, or objects that represent the imagery and mood of the quote. Do not depict the author. Focus on nature, atmosphere, or symbolic elements suitable for a watercolor painting.
    4. The correct author name.
    5. The correct book name.

    Return JSON matching this schema:
    {
      "quote": "string",
      "authorName": "string",
      "bookName": "string",
      "hinduDateDetails": "string",
      "visualDescription": "string"
    }
  `;

  const textResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: textPrompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          authorName: { type: Type.STRING },
          bookName: { type: Type.STRING },
          hinduDateDetails: { type: Type.STRING },
          visualDescription: { type: Type.STRING },
        },
        required: ['quote', 'authorName', 'bookName', 'hinduDateDetails', 'visualDescription']
      }
    }
  });

  const textData: TextResponse = JSON.parse(textResponse.text || '{}');

  // 2. Generate Image Content
  const imagePrompt = `
    A beautiful, soft watercolor masterpiece.
    Subject: ${textData.visualDescription}.
    Style: Ethereal, dreamy, pastel lavender and soft warm tones, wet-on-wet watercolor technique, artistic, high quality, detailed.
  `;

  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: imagePrompt,
  });

  // Extract base64 image
  let imageBase64 = '';
  let imageMimeType = 'image/jpeg';

  const parts = imageResponse.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        imageBase64 = part.inlineData.data;
        if (part.inlineData.mimeType) {
          imageMimeType = part.inlineData.mimeType;
        }
        break;
      }
    }
  }

  if (!imageBase64) {
    throw new Error("Failed to generate image.");
  }

  return { textData, imageBase64, imageMimeType };
};