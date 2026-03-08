import { GoogleGenAI, Type } from "@google/genai";

export interface Question {
  id?: number;
  category: string;
  question: string;
  options: string[];
  correct_answer: string;
}

export async function generateQuestions(category: string, count: number = 5): Promise<Question[]> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing");
    return [];
  }
  
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Generate ${count} multiple choice questions for a Polri (Indonesian Police) entrance exam in the category: ${category}. 
  The categories are:
  - 'kepribadian' (personality): questions about ethics, behavior, and psychological traits.
  - 'ketelitian' (accuracy/precision): questions involving finding patterns, differences in symbols/numbers, or rapid counting.
  - 'kecerdasan' (intelligence): logical reasoning, verbal analogy, or mathematical problems.
  
  Return the result as a JSON array of objects with the following structure:
  {
    "category": "${category}",
    "question": "The question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "The exact text of the correct option"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              question: { type: Type.STRING },
              options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              },
              correct_answer: { type: Type.STRING }
            },
            required: ["category", "question", "options", "correct_answer"]
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating questions:", error);
    return [];
  }
}
