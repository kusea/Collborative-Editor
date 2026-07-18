import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { protect } from './middlewares/auth.js';
import { register, login } from './controllers/authController.js';
import { DocumentController } from './controllers/docController.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from "jsonwebtoken";
import * as Y from 'yjs';

dotenv.config();

const app = express();

// ------- Middleware -------
app.use(cors());
app.use(express.json());

// ------- Connect database -------
connectDB();

// ------- API Routes -------
//Authentic
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);

app.post('/api/documents', protect, DocumentController.createDocument);
app.get('/api/documents', protect, DocumentController.getDocument);
app.delete('/api/documents/:id', protect, DocumentController.deleteDocument);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const activeDocs = new Map<string, Y.Doc>();

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) 
        return next(new Error("Authentication error"));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {id: string};
        socket.data.userId = decoded.id;
        next();
    } catch (err) {
        next(new Error("Authentication error"));
    }
});

io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id} (User: ${socket.data.userId})`);
    
    socket.on("join-document",(docId: string) =>{
        if(!docId) return;

        socket.rooms.forEach(room => {
            if (room != socket.id) socket.leave(room);
        })

        socket.join(docId);
        console.log(`User ${socket.data.userId} joined document ${docId}`);

        if(!activeDocs.has(docId)){
            activeDocs.set(docId, new Y.Doc());
        }

        const yDoc = activeDocs.get(docId)!;
        // Send current state of the server to the client that joined to initially sync
        const currentUpdate = Y.encodeStateAsUpdate(yDoc);
        socket.emit("init-document-state", currentUpdate);
    });

    // Handle the binary update that the client sends
    socket.on("update-document", ({docId, update}: {docId: string, update: Uint8Array}) => {
        if (!activeDocs.has(docId)) return;
        const yDoc = activeDocs.get(docId);
        if (!yDoc) return;

        try {
            // Transfer the update from the Nodejs data to the form of Uint8Array for Yjs to resolve 
            const binaryUpdate = new Uint8Array(update);

            // Merge the update into the document
            Y.applyUpdate(yDoc, binaryUpdate);

            // Spread or broadcast the update to other clients
            socket.to(docId).emit("document-broadcast", binaryUpdate);
        } catch (error) {
            console.error("Error applying update:", error);
        }
    });

    socket.on("disconnect", ()=> {
        console.log(`Client disconnected: ${socket.id}`);
    })
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

