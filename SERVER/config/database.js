import mongoose from "mongoose";
import dotenv from "dotenv"

dotenv.config();

export const connectDB = () => {
    mongoose.connect(process.env.MONGO_DB_URL, {
        dbName: "Re-Trade-Hub"
    })
        .then(() => {
            console.log('Database connected');
        })
        .catch((e) => {
            console.error('Database connection failed:', e.message);
            process.exit(1)
        })
}