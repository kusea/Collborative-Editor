import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../models/User.js";

const generateToken = (id: string) => {
    return jwt.sign({id}, process.env.JWT_SECRET as string, {expiresIn: "7d"});
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            res.status(400).json({message: "Username, email and password are required"});
            return;
        }
        
        const existing_user = await User.findOne({$or: [{username: username}, {email: email}]});
        if (existing_user) {
            res.status(400).json({message: "User already exists"});
            return; 
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPass = await bcrypt.hash(password, salt);

        const new_user = await User.create({username, email, password: hashedPass});

        res.status(201).json({
            token: generateToken(new_user._id.toString()),
            user: {id: new_user._id, username: new_user.username, email: new_user.email}
        })
    } catch (error) {
        res.status(500).json({message: "Server error"});
        console.log(`Error registering user: ${error}`);
        return; 
    }
}

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const {email, password} = req.body;

        if (!email || !password) {
            res.status(400).json({message: "Email and password are required"});
            return;
        }

        const user = await User.findOne({email});
        if (!user) {
            res.status(400).json({message: "User not found"});
            return; 
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({message: "Invalid password"});
            return; 
        }

        res.status(201).json({
            token: generateToken(user._id.toString()),
            user: {id: user.id, username: user.username, email: user.email}
        });
    } catch (error) {
        res.status(500).json({message: "Server error"});
        console.log(`Error logging in user: ${error}`);
        return;
    }
}