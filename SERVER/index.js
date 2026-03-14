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

const allowedOrigins = [
    "https://www.codenixlabs.com",
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
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