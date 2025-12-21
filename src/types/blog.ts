export interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    avatar: string;
  };
  category: string;
  tags: string[];
  featuredImage: string;
  publishedAt: string;
  readTime: number;
  isPublished: boolean;
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}

export interface BlogCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
}

export interface Pagination {
  current: number;
  total: number;
  limit: number;
  pages: number;
}

export interface BackendBlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    avatar: string;
  };
  category: string;
  tags?: string[];
  featuredImage: string;
  publishedAt?: string;
  createdAt?: string;
  readTime?: number;
  isPublished?: boolean;
  SEO?: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  seo?: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
}