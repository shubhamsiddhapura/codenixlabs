import express from 'express'
import { connectDB } from './config/database.js'
import dotenv from 'dotenv'
import cors from 'cors'
import blogRoutes from './routes/blog.js'
import ogImageRoutes from './routes/ogImage.js'
import Blog from './models/blog.js'

const app = express();
dotenv.config();
const PORT = process.env.PORT || 4000;

connectDB();

app.get('/health', (req, res) => res.status(200).send('OK'));

const allowedOrigins = [
    "https://www.codenixlabs.com",
    // "http://localhost:3000",
    // "http://localhost:4000",
    // "http://localhost:5173",
    // "localhost:3000",
    // "localhost:4000",
    // "localhost:5173"
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            return callback(null, true);
        }
        
        // Check if origin is in allowed list or is localhost in development
        if (allowedOrigins.includes(origin) || /localhost/.test(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

app.use(express.json());

// Note: Crawler detection handled at Vercel edge level via vercel.json rewrites
// This backend only needs to serve the OG endpoint for crawlers that access it directly

app.use('/api/blogs', blogRoutes);
app.use('/api/og', ogImageRoutes);

app.get("/", (req, res) => {
    return res.json({
        success: true,
        message: "Your server is up and running....",
    });
});

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

app.listen(PORT, () => {
    console.log(`Your server started at ${PORT}`);
});