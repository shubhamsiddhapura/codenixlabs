import express from 'express'
import { connectDB } from './config/database.js'
import dotenv from 'dotenv'
import cors from 'cors'
import blogRoutes from './routes/blog.js'

const app = express();
dotenv.config();
const PORT = process.env.PORT || 4000;

connectDB();

app.get('/health', (req, res) => res.status(200).send('OK'));

app.use(cors({
    origin: "https://www.codenixlabs.com",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use('/api/blogs', blogRoutes);

app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Your server is up and running....",
    });
});

app.listen(PORT, () => {
    console.log(`Your server started at ${PORT}`);
});