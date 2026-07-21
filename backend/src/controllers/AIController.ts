import type { Request, Response } from "express";
import OpenAI from 'openai';

const getAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY || "";
    const baseURL = process.env.OPENAI_BASE_URL || "";

    if (!apiKey) {
        throw new Error("Missing API key");
    }

    return new OpenAI({ apiKey, baseURL });
}

export const handleAIEdit = async (req: Request, res: Response) => {
    try {
        const { text, action, prompt} = req.body;

        if (!text) return res.status(400).json({ error: "Text is required" });
        if (!action) return res.status(400).json({ error: "Action is required" });

        const openai = getAIClient();
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
                systemInstr = 'You are a professional text editing assistant.';
                userPrompt = `Original text:\n"${text}"\n\nInstruction: ${prompt}`;
                break;
            default:
                return res.status(400).json({ error: "Invalid action" });
        }

        const response = await openai.chat.completions.create({
            "model": "qwen/qwen3.6-27b",
            "messages": [
                { role: "system", content: systemInstr },
                { role: "user", content: userPrompt },
            ],
            "temperature": 0.6,
            "stream": false
        })

        const result = response.choices[0]?.message?.content || "";
        return res.status(200).json({ result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
};