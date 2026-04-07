# Codenix Labs - Complete Project Reference

## 1. PROJECT OVERVIEW
**Codenix Labs** is a modern software development agency website built as a full-stack application. It's a portfolio/marketing platform for a tech company that showcases services, portfolio work, blog content, and client testimonials with a professional, animated interface.

**Live URL:** https://www.codenixlabs.com

---

## 2. TECH STACK

### Frontend
- **Framework:** React 18.3 + TypeScript 5.5
- **Build Tool:** Vite 5.4
- **Routing:** React Router DOM 6.16
- **Styling:** Tailwind CSS 3.4 + PostCSS
- **Animations:** Framer Motion 10.16 + GSAP 3.12
- **3D Graphics:** Three.js 0.158 + React Three Fiber 8.15
- **UI Icons:** Lucide React 0.344
- **SEO/Meta:** React Helmet Async 3.0
- **Analytics:** Vercel Analytics
- **Email Service:** EmailJS 4.4

### Backend
- **Runtime:** Node.js with ES modules
- **Framework:** Express 5.2 (Backend) / 5.1 (API)
- **Database:** MongoDB with Mongoose 8.16
- **Image Processing:** Sharp 0.34
- **CORS:** CORS 2.8
- **Environment:** dotenv 17.0

### Development Tools
- **Package Manager:** npm
- **Code Quality:** ESLint 9.9
- **Task Runner:** Concurrently (runs Vite + Node.js simultaneously)
- **Dev Server (Backend):** Nodemon 3.1

---

## 3. ARCHITECTURE

### Full-Stack Structure
```
Frontend (Vite + React) → Port 5173
    ↓ (API Calls)
Backend (Express) → Port 4000
    ↓ (Database Operations)
MongoDB
```

### Key Separation
- **Client App:** Pure React frontend with no database calls
- **Backend API:** Separate Node.js server handling all DB operations
- **CORS Protection:** Only allows requests from codenixlabs.com + localhost (dev)
- **OG Image Generation:** Separate endpoint for social media preview images

---

## 4. FILE STRUCTURE

```
codenixlabs/
├── src/                          # Frontend source
│   ├── App.tsx                   # Main app with routing
│   ├── main.tsx                  # Vite entry point
│   ├── index.css                 # Global styles
│   ├── pages/                    # Route-based pages
│   │   ├── Home.tsx              # Hero, services, testimonials
│   │   ├── Services.tsx          # Service details
│   │   ├── Portfolio.tsx         # Project showcase
│   │   ├── Blog.tsx              # Blog listing (calls API)
│   │   ├── BlogPost.tsx          # Individual blog post
│   │   ├── AdminBlog.tsx         # Blog management UI
│   │   ├── About.tsx             # Company info
│   │   ├── Contact.tsx           # Contact form with EmailJS
│   │   ├── DemoShowcase.tsx      # Internal demo page
│   │   └── [Policy pages]        # Privacy, Terms, Cookie
│   ├── components/               # Reusable React components
│   │   ├── HeroSection.tsx       # 3D hero with Three.js
│   │   ├── Navbar.tsx            # Navigation
│   │   ├── Footer.tsx            # Footer
│   │   ├── BlogCard.tsx          # Blog item card
│   │   ├── ProjectCard.tsx       # Portfolio item
│   │   ├── ServiceCard.tsx       # Service item
│   │   ├── TestimonialCard.tsx   # Review/testimonial
│   │   ├── TeamMember.tsx        # Team member profile
│   │   ├── Cursor.tsx            # Custom cursor effect
│   │   ├── LoadingScreen.tsx     # 2.5s loading animation
│   │   └── [Other components]    # Timeline, Stats, etc
│   ├── services/
│   │   └── blogService.ts        # API wrapper for blog endpoints
│   └── types/
│       └── blog.ts               # TypeScript interfaces
│
├── SERVER/                       # Backend source
│   ├── index.js                  # Express app setup + routes mounting
│   ├── package.json              # Backend dependencies
│   ├── config/
│   │   └── database.js           # MongoDB connection
│   ├── models/
│   │   └── blog.js               # Mongoose Blog schema
│   ├── controllers/
│   │   ├── blogPost.js           # Blog CRUD + filtering logic
│   │   └── ogImage.js            # OG image generation
│   ├── routes/
│   │   ├── blog.js               # All blog-related endpoints
│   │   └── ogImage.js            # OG image endpoints
│   └── middleware/
│       └── crawlerRedirect.js    # Bot/crawler detection
│
├── public/                       # Static files
│   ├── robots.txt                # SEO robot configuration
│   ├── sitemap.xml               # XML sitemap
│   ├── site.webmanifest          # PWA manifest
│   ├── portfolio/                # Portfolio images
│   ├── brochure/                 # Marketing materials
│   └── festival_post/            # Event posts
│
├── vite.config.ts                # Vite build configuration
├── tailwind.config.js            # Tailwind settings
├── tsconfig.json                 # TypeScript config
├── package.json                  # Frontend dependencies + scripts
├── index.html                    # HTML entry point (SEO meta tags)
└── vercel.json                   # Vercel deployment config
```

---

## 5. KEY FEATURES

### 1. **Dynamic Blog System**
- Admin interface to create/edit blog posts
- REST API for CRUD operations
- Filtering by category, author, tags
- Search functionality
- SEO metadata per post
- OG image generation for social sharing

### 2. **Portfolio Showcase**
- Project gallery with categories
- Testimonials from clients
- Team member profiles
- Case studies and work examples

### 3. **Lead Generation**
- Contact form with EmailJS integration
- Newsletter signup
- Demo showcase page

### 4. **Performance & SEO**
- Meta tags for all pages
- Canonical URL implementation
- OG (Open Graph) protocol support
- XML sitemap
- Robots.txt for crawlers
- Google Site Verification
- Read time estimation for blogs

### 5. **Advanced UI/UX**
- 3D hero section using Three.js
- Smooth scroll animations (GSAP)
- Custom cursor effects
- Loading screen animation
- Framer Motion page transitions
- Responsive design (Tailwind)

### 6. **Security**
- CORS protection (only codenixlabs.com allowed in production)
- HTML escaping for safe rendering
- Environment variable protection (.env)
- Mongoose schema validation

---

## 6. DATABASE SCHEMA

### Blog Collection (MongoDB)
```javascript
{
  _id: ObjectId,
  title: String (required),
  slug: String (required, unique, indexed),
  excerpt: String (required),
  content: String (required, full HTML/markdown),
  author: {
    name: String (required),
    avatar: String (URL to image)
  },
  category: String (required),
  tags: [String],
  featuredImage: String (URL),
  SEO: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

**Indexed field:** `slug` (speeds up OG endpoint lookups)

---

## 7. API ENDPOINTS

### Base URL: `https://www.codenixlabs.com/api/blogs` (Production)

#### Blog CRUD
- `POST /` - Create blog post
- `GET /` - Get all blogs (with pagination, filtering)
- `GET /:id` - Get blog by MongoDB ID
- `GET /slug/:slug` - Get blog by URL slug (SEO-friendly)
- `PUT /:id` - Update blog post
- `DELETE /:id` - Delete blog post

#### Filtering & Search
- `GET /category/:category` - Get blogs by category
- `GET /author/:author` - Get blogs by author
- `GET /tag/:tag` - Get blogs with specific tag
- `GET /search/posts?search=keyword` - Full-text search
- `GET /featured/posts` - Get featured blogs

#### Metadata
- `GET /meta/categories` - Get all blog categories
- `GET /meta/tags` - Get all tags used
- `GET /stats/analytics` - Blog statistics

#### Open Graph (Social Media)
- `GET /og/:slug` - Get OG image + metadata for blog post
- `GET /og/home` - Get OG image for homepage

#### Query Parameters (for GET /)
- `page` - Pagination (default: 1)
- `limit` - Items per page (default: 10)
- `category` - Filter by category
- `author` - Filter by author
- `tags` - Comma-separated tag filters
- `search` - Search in title/excerpt/content

**Health Check:**
- `GET /health` - Returns "OK" if server running

---

## 8. HOW THE PROJECT WORKS

### Data Flow Diagram

```
User Browser (Frontend)
    ↓
Vite Dev Server (localhost:5173) / Production Build
    ↓
React Components Load → User navigates to /blog
    ↓
blogService.ts makes fetch() to /api/blogs
    ↓
Express Backend (localhost:4000 / production server)
    ↓
blog.js routes → blogPost.js controller
    ↓
Mongoose queries MongoDB
    ↓
Data returned as JSON
    ↓
Frontend transforms data → BlogCard components render
    ↓
User sees blog list with animations
```

### Blog Creation Flow
1. Admin visits `/admin/blog` page
2. Fills in blog form (title, content, category, etc.)
3. Form submitted to `POST /api/blogs`
4. Backend validates & checks for duplicate slug
5. Mongoose saves to MongoDB
6. Response returns created blog data
7. Frontend redirects to blog list or shows success

### Blog Reading Flow
1. User visits `/blog` → Lists all blogs from API
2. User clicks blog card
3. App routes to `/blog/:slug`
4. `BlogPost.tsx` fetches from `/api/blogs/slug/:slug`
5. Content rendered with metadata
6. OG image generated at `/api/og/:slug` for social sharing

### Social Media Sharing
When user shares blog on Twitter/Facebook:
- Social crawler visits `/blog/:slug`
- Vercel edge middleware redirects to `/api/og/:slug`
- Backend generates OG image with blog metadata
- Crawler fetches meta tags from HTML
- Preview shown with custom image + title/description

---

## 9. START COMMANDS

### Development (Frontend + Backend together)
```bash
npm run dev
# Starts: Vite (5173) + Express (4000) concurrently
```

### Development (Backend only)
```bash
cd SERVER
npm run dev
# Uses nodemon for auto-restart on file changes
```

### Production Build
```bash
npm run build
# Creates optimized frontend build in dist/
```

### Linting
```bash
npm run lint
# Checks code with ESLint
```

---

## 10. ENVIRONMENT VARIABLES

### Frontend (.env or .env.local)
```
VITE_API_BASE_URL=https://www.codenixlabs.com (production)
# OR http://localhost:4000 (development)
```

### Backend (.env in SERVER/)
```
PORT=4000
MONGO_DB_URL=mongodb+srv://user:pass@cluster.mongodb.net
NODE_ENV=development|production
```

---

## 11. KEY COMPONENTS OVERVIEW

| Component | Purpose |
|-----------|---------|
| `HeroSection.tsx` | 3D canvas with Three.js animations |
| `Navbar.tsx` | Navigation with smooth scroll links |
| `BlogCard.tsx` | Individual blog post card in list |
| `ServiceCard.tsx` | Service offering display |
| `TestimonialCard.tsx` | Client review/rating display |
| `ProjectCard.tsx` | Portfolio project showcase |
| `Cursor.tsx` | Custom mouse cursor effect |
| `LoadingScreen.tsx` | 2.5s splash screen on load |

---

## 12. EXTERNAL INTEGRATIONS

### EmailJS
- **Purpose:** Contact form email delivery
- **Used in:** Contact.tsx page
- **Flow:** Form data → EmailJS → Inbox

### Vercel Analytics
- **Purpose:** Track user behavior
- **Used in:** App.tsx
- **Data:** Page views, user interactions

### Cloudinary (Optional)
- **Purpose:** Image optimization & CDN
- **Used in:** Asset URLs in blog posts, portfolio

---

## 13. CURRENT LIMITATIONS & NOTES

1. **Blog Creation:** No built-in auth. Admin panel visible but ideally needs JWT/session protection.
2. **Image Uploads:** Currently uses external URLs. No file upload endpoint.
3. **Comments:** Blog posts don't support comments (would need new collection + endpoints).
4. **Caching:** No Redis caching. Each request hits MongoDB directly.
5. **Categories/Tags:** Hard-coded in blogService.ts, not fetched from DB.
6. **Rate Limiting:** No rate limiting protection on API endpoints.
7. **Pagination:** Basic offset/limit. No cursor-based pagination.

---

## 14. DEPLOYMENT SETUP

### Current Deployment: Vercel

**Frontend:**
- Builds automatically from git push
- Runs `npm run build` → deploys `dist/` folder
- Environment: `VITE_API_BASE_URL` set in Vercel dashboard

**Backend:**
- Express server runs on Vercel Serverless Functions OR external Node host
- Or can be deployed to Render.com, Railway, Heroku, AWS

**Database:**
- MongoDB runs on MongoDB Atlas (cloud)
- Connection string in `MONGO_DB_URL` environment variable

**vercel.json Config:**
- Redirects social crawlers to OG endpoint
- Handles bot detection for dynamic meta tags

---

## 15. HOW TO IMPLEMENT AN AI AGENT

### Integration Points for AI Agent:

1. **Blog Content Generation**
   - Create endpoint: `POST /api/blogs/generate` that accepts prompt
   - AI generates title, content, excerpt
   - Save to MongoDB
   - ✅ Database ready, API structure exists

2. **Auto-Categorization**
   - Extract keywords from blog content
   - Assign category/tags automatically
   - Store in SEO field

3. **AI-Powered Search**
   - Semantic search instead of regex search
   - Use embedding API (OpenAI, Cohere)
   - Vector similarity queries in MongoDB

4. **Dynamic OG Image Generation**
   - Use AI to generate custom images per blog
   - Replace static OG endpoint with dynamic generation
   - Current system uses `sharp` (great for this)

5. **Smart Email Responses**
   - Contact form → AI analyzes inquiry
   - Auto-draft responses for common questions
   - Flag complex inquiries for human review

6. **Content Recommendations**
   - ML model recommends related blogs to users
   - Store embeddings in MongoDB
   - Return top 3 similar posts

7. **SEO Optimization**
   - AI suggests better titles, meta descriptions
   - Endpoint: `POST /api/blogs/:id/optimize-seo`
   - Improves search ranking

8. **Blog CMS Enhancement**
   - `/admin/blog` page → add AI writing assistant
   - Real-time suggestions as user types
   - Auto-complete sentences

### Recommended AI Services:
- **OpenAI GPT-4** - Content generation, summarization
- **Cohere** - Semantic search, classification
- **Together AI** - Open-source LLM option
- **Hugging Face** - Fine-tuned models for specific tasks

### Architecture Addition:
```
React Components ↔ Express Routes ↔ MongoDB (existing)
                        ↓
                  AI Service (OpenAI/Cohere API)
                        ↓
                  Vector Database (MongoDB or Pinecone)
```

---

## 16. SUMMARY FOR AI AGENT CONTEXT

**What This Project Is:**
A modern web agency portfolio with a dynamic blog system, built with React frontend + Express backend + MongoDB database.

**Key Technologies:**
React, TypeScript, Tailwind, Three.js, GSAP, Express, MongoDB, Mongoose.

**What It Does:**
- Showcases services & portfolio
- Manages blog posts with CRUD API
- Generates social media preview images
- Collects leads via contact form
- Serves 3D animations & smooth UX

**Where AI Can Help:**
1. Auto-generate blog content
2. Intelligent blog search
3. Auto-optimize SEO metadata
4. Generate custom OG images
5. Smart content recommendations
6. AI writing assistant in admin panel

**Ready for Integration:**
✅ API structure exists
✅ Database normalized
✅ Backend serverless-ready
✅ CORS configured
✅ Environment variables supported

---

## 17. QUICK REFERENCE - CRITICAL FILES

| File | Purpose | Status |
|------|---------|--------|
| `SERVER/index.js` | Express app setup | ✅ Production-ready |
| `SERVER/models/blog.js` | MongoDB schema | ✅ Indexed slug |
| `SERVER/controllers/blogPost.js` | All blog logic | ✅ Filtering works |
| `src/services/blogService.ts` | API wrapper | ✅ Error handling |
| `src/pages/Blog.tsx` | Blog listing UI | ✅ Displays all posts |
| `src/pages/AdminBlog.tsx` | Admin panel | ⚠️ No auth |
| `vite.config.ts` | Build config | ✅ CORS ready |
| `package.json` (root) | Frontend deps | ✅ All current |

---

**Version:** 1.0
**Last Updated:** April 4, 2026
**Project Name:** Codenix Labs - Software Development Agency
**Status:** Production (Live at codenixlabs.com)