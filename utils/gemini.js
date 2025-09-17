// backend/utils/gemini.js
import OpenAI from "openai";

const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export const model = {
  generateContent: async (prompt) => {
    const response = await AI.chat.completions.create({
      model: "gemini-2.5",
      messages: [{ role: "user", content: prompt }],
    });
    return response;
  },
};

export const extractText = (response) => {
  return response?.choices?.[0]?.message?.content || "";
};
