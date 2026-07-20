import mongoose from 'mongoose';
import { Document } from './Document.js';

async function migrate() {
    await mongoose.connect('MONGODB_URI_CUAM_BAN');
    
    const result = await Document.updateMany(
        { content: { $exists: false } },
        { $set: { content: '', updatedAt: new Date() } }
    );

    console.log(`Đã cập nhật bổ sung trường cho ${result.modifiedCount} documents cũ.`);
    process.exit(0);
}

migrate();