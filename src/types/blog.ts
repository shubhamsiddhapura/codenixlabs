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
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  readTime?: number;
  status: "draft" | "published";
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  // SEO?: {
  //   metaTitle?: string;
  //   metaDescription?: string;
  //   keywords?: string[];
  // };
}

export interface BlogCategory {
  _id: string;
  name: string;
  slug: string;
  description: string;
  color: string;
}