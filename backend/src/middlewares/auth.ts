import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
    userId?: string;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    
    if (!token) {
        res.status(401).json({ message: "Not authorized, no token" });
        return;
    }


    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "") as { id: string};
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ message: "Not authorized, token failed or expired" });
    }
}