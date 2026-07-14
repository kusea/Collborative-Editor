import mongoose from "mongoose";

export const connectDB = async(): Promise<void> => {
    try{
        const connect = await mongoose.connect(process.env.MONGO_URI || "");
        console.log(`MongoDB connected: ${connect.connection.host}`);
    }catch(err){
        console.log(`Error connecting to MongoDB: ${err}`);
        process.exit(1);
    }
}