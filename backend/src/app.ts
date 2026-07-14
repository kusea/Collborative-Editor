import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { protect } from './middlewares/auth.js';
import { register, login } from './controllers/authController.js';

dotenv.config();

const app = express();

// ------- Middleware -------
app.use(cors());
app.use(express.json());

// ------- Connect database -------
connectDB();

// ------- API Routes -------
//Authentic
app.post('/auth/register', register);
app.post('/auth/login', login);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
