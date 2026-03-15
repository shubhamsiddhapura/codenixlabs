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

// COMPREHENSIVE LOGGING MIDDLEWARE
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const path = req.path;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const origin = req.headers['origin'] || 'Unknown';
    const referer = req.headers['referer'] || 'Unknown';
    
    console.log(`\n📥 [${timestamp}] ${method} ${path}`);
    console.log(`   Origin: ${origin}`);
    console.log(`   Referer: ${referer}`);
    console.log(`   User-Agent: ${userAgent}`);
    
    // Check if crawler
    const isCrawler = /bot|crawler|linkedin|twitter|facebook|twitterbot|whatsapp|pinterest|reddit|tumblr/i.test(userAgent);
    if (isCrawler) {
        console.log(`   ⚠️  CRAWLER DETECTED: ${userAgent}`);
        console.log(`   🎯 [IMPORTANT] Crawler accessing: ${path}`);
    }
    
    // Log response
    const originalSend = res.send;
    res.send = function(data) {
        console.log(`📤 [${method} ${path}] Status: ${res.statusCode}`);
        if (isCrawler && path.includes('/api/blogs/og')) {
            console.log(`   ✅ OG endpoint returning data to crawler`);
        }
        return originalSend.call(this, data);
    };
    
    next();
});

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
    console.log('\n========================================');
    console.log('🚀 [SERVER] Started Successfully');
    console.log(`🚀 [SERVER] Listening on PORT: ${PORT}`);
    console.log(`🚀 [SERVER] Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`🚀 [SERVER] Frontend URL: https://www.codenixlabs.com`);
    console.log(`🚀 [SERVER] API Base: https://codenix-labs-server.onrender.com`);
    console.log('========================================\n');
    
    // Log available routes
    console.log('📍 [ROUTES] Available Endpoints:');
    console.log('   GET  /health - Health check');
    console.log('   GET  /api/blogs - Get all blogs');
    console.log('   GET  /api/blogs/og/:slug - Get OG meta tags for crawler');
    console.log('   GET  /api/blogs/slug/:slug - Get blog by slug');
    console.log('   POST /api/blogs - Create blog');
    console.log('======================================\n');
});