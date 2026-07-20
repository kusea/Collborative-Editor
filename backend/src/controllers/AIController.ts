import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export const handleAIEdit = async (req: Request, res: Response) => {
    try {
        const { text, action, prompt } = req.body;

        if (!text) return res.status(400).json({ error: "Text is required" });
        if (!action) return res.status(400).json({ error: "Action is required" });
        if (!prompt) return res.status(400).json({ error: "Prompt is required" });

        let systemInstr = "";
        let userPrompt = "";

        switch (action) {
            case 'continue': 
                systemInstr = "You are a professional writing assistant. Continue the provided text naturally and fluently in the same language as the original text.";
                userPrompt = `Original text: \n\n${text}\n\n. Please write the next 2-4 sentences: \n`;
                break;
            case 'summarize':
                systemInstr = "You are a text summarization assistant. Summarize the provided text naturally and fluently in the same language as the original text.";
                userPrompt = `Original text: \n\n${text}\n\n. Summarize the main points: \n`;
                break;
            case 'custom':
                systemInstr = "You are a professional text editting assistant.";
                userPrompt = `Original text: \n\n${text}\n\n. ${prompt}`;
                break;
            default:
                return res.status(400).json({ error: "Invalid action" });
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userPrompt,
            config: {
                systemInstruction: systemInstr,
                temperature: 0.7,
            }
        })

        const result = response.text;
        return res.status(200).json({ result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};