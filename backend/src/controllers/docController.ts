import type { Response } from "express";
import type { AuthRequest } from "../middlewares/auth.js";
import { Document } from "../models/Document.js";

const createDocument = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
    try {
        const { title } = req.body;
        const ownerId = req.userId;

        if (!ownerId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const newDocument = await Document.create({
            title: title || "Untitled Document",
            owner: ownerId,
        });

        const responseData = newDocument.toObject();

        console.log(`Document: ${JSON.stringify(responseData)}`);
        res.status(200).json(responseData);
    } catch (error) {
        res.status(500).json({
            message: "Server error in creating a new document",
        });
        console.log(`Error creating a new document: ${error}`);
        return;
    }
};

const getDocument = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
    try {
        const ownerId = req.userId;

        if (!ownerId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }
        const docs = await Document.find({ owner: ownerId })
            .sort({ updatedAt: -1 })
            .lean();

        res.status(200).json(docs);
    } catch (error) {
        res.status(500).json({ message: "Server error in getting a document" });
        console.log(`Error getting a document: ${error}`);
        return;
    }
};

const deleteDocument = async (
    req: AuthRequest,
    res: Response,
): Promise<void> => {
    try {
        const { id } = req.params;
        const ownerId = req.userId;

        if (!ownerId) {
            res.status(401).json({ message: "Not authorized" });
            return;
        }

        const deletedDocument = await Document.findOneAndDelete({
            _id: id,
            owner: ownerId,
        }); //findOneAndDelete

        if (!deletedDocument) {
            res.status(404).json({ message: "Document not found" });
            return;
        }

        res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
        res.status(500).json({
            message: "Server error in deleting a document",
        });
        console.log(`Error deleting a document: ${error}`);
        return;
    }
};

export const DocumentController = {
    createDocument,
    getDocument,
    deleteDocument,
};