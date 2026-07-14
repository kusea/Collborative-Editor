import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.js";
import { Document } from "../models/Document.js";

export const createDocument = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title } = req.body;
        const ownerId = req.userId;

        if (!ownerId) {
            res.status(401).json({message: "Not authorized"});
            return;
        }

        const newDocument = await Document.create({
            title: title || "Untitled Document", 
            owner: ownerId
        });
        res.status(200).json(newDocument);
    } catch (error) {
        res.status(500).json({message: "Server error in creating a new document"});
        console.log(`Error creating a new document: ${error}`);
        return;
    }
}

export const getDocument = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const ownerId = req.userId;

        if (!ownerId) {
            res.status(401).json({message: "Not authorized"});
            return;
        }
        const docs = await Document.find({owner: ownerId}).sort({ updatedAt: -1 });
        res.status(200).json(docs);
    } catch (error) {
        res.status(500).json({message: "Server error in getting a document"});
        console.log(`Error getting a document: ${error}`);
        return;
    }
}