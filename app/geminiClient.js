// app/geminiClient.js
import { GoogleGenAI } from "@google/genai";
import "dotenv/config.js";

export class GeminiClient {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in .env");
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async ask(prompt) {
    try {
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash-001", // or gemini-2.5-flash-preview-04-17
        contents: prompt,
      });
      return response.text || "[No response from Gemini]";
    } catch (error) {
      return `Gemini Error: ${error.message}`;
    }
  }
}
