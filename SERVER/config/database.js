import mongoose from "mongoose";
import dotenv from "dotenv"

dotenv.config();

export const connectDB = () => {
    console.log('🔄 [DATABASE] Attempting to connect to MongoDB...');
    console.log('🔄 [DATABASE] URL:', process.env.MONGO_DB_URL ? 'SET' : 'NOT SET');
    
    mongoose.connect(process.env.MONGO_DB_URL, {
        dbName: "Re-Trade-Hub"
    })
        .then(() => {
            console.log('✅ [DATABASE] Connected successfully');
            console.log('✅ [DATABASE] Database: Re-Trade-Hub');
        })
        .catch((e) => {
            console.error('❌ [DATABASE] Connection Failed');
            console.error('❌ [DATABASE] Error:', e.message);
            console.error('❌ [DATABASE] Stack:', e.stack);
            process.exit(1)
        })
}