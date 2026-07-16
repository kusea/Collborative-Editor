import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from "jsonwebtoken";
import { connectDB } from './config/database.js';
import { protect } from './middlewares/auth.js';
import { register, login } from './controllers/authController.js';
import { createDocument, getDocument } from './controllers/docController.js';

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

app.post('/api/documents', protect, createDocument);
app.get('/api/documents', protect, getDocument);

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ['GET', 'POST'],
        credentials: true
    }
})

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error('Authentication error: No error provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as {id: string};
        socket.data.userId = decoded.id;
        next();
    } catch (err) {
        next(new Error('Authentication error: Invalid token'));
    }
});

// Manage Websocket connection
io.on("connection",(socket) => {
    // Listen for client request to join to editor documents
    socket.on("join-document", (docId: string) => {
        if (!docId) return;
        // Leave other rooms (except the default room with id of this socket )
        socket.rooms.forEach((room) => {
            if (room != socket.id) {
                socket.leave(room);
            }
        });

        socket.join(docId);
        console.log(`User ${socket.data.userId} joined document ${docId}`);
    })

    socket.on("disconnect", () => {
        console.log(`User ${socket.data.userId} disconnected`);
    })
})


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
