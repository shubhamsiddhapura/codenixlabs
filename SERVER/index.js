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
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin) || /localhost/.test(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true
}));

app.use(express.json());

// Log every request + response status
app.use((req, res, next) => {
    const start = Date.now();
    console.log(`[REQ] ${req.method} ${req.path} | origin: ${req.headers.origin || 'none'}`);
    res.on('finish', () => {
        console.log(`[RES] ${req.method} ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
});

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

// Global error handler — must be last, after all routes
app.use((err, req, res, next) => {
    console.error(`[ERROR] ${req.method} ${req.path} | ${err.message}`);
    console.error(err.stack);
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(err.status || 500).json({ success: false, message: err.message });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});