"use client";

import { motion } from "framer-motion";
import { Calendar, User, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchPublicData } from "@/lib/api";
import Image from "next/image";

type BlogItem = {
  id: number;
  title: string;
  image_url: string | null;
  content_html: string | null;
  created_by: string;
  created_at: string;
};

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
  }).format(date);
}

export default function BlogDetailPage() {
  const params = useParams();
  const [blog, setBlog] = useState<BlogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!params.id) return;
      const res = await fetchPublicData(`/public/blogs/${params.id}`);
      if (res && res.id) {
        setBlog(res);
      } else {
        setError("Blog not found.");
      }
      setLoading(false);
    }
    load();
  }, [params.id]);


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-4xl font-black text-slate-50 mb-4">404</h1>
        <p className="text-slate-400 mb-8">{error || "Blog post not found."}</p>
        <Link href="/blogs" className="btn-nft-primary">
          Back to Blogs
        </Link>
      </div>
    );
  }

  return (
    <div className="py-24 relative overflow-hidden">
      <div className="ambient-glow top-[-100px] left-[-100px] bg-primary/30" />
      
      <div className="container-custom relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          <Link 
            href="/blogs" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-12 font-bold uppercase tracking-widest text-xs"
          >
            <ArrowLeft size={16} />
            Back to Insights
          </Link>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 mb-10 tracking-tighter leading-[1.1]">
            {blog.title}
          </h1>

          <div className="flex flex-wrap items-center gap-8 text-sm font-bold uppercase tracking-widest text-slate-500 mb-16 border-y border-border/60 py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User size={20} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-600">Published by</span>
                <span className="text-slate-700">{blog.created_by}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Calendar size={20} />
              </div>
              <div>
                <span className="block text-[10px] text-slate-600">Date</span>
                <span className="text-slate-700">{formatDate(blog.created_at)}</span>
              </div>
            </div>
          </div>

          {blog.image_url && (
            <div className="relative aspect-[21/9] w-full rounded-[3rem] overflow-hidden mb-20 border border-border/50 shadow-2xl">
              <Image 
                src={blog.image_url} 
                alt={blog.title} 
                fill 
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
            </div>
          )}

            <article 
            className="prose max-w-none 
              prose-headings:font-black prose-headings:tracking-tighter prose-headings:text-slate-900
              prose-p:text-slate-700 prose-p:text-xl prose-p:leading-relaxed
              prose-strong:text-primary prose-a:text-primary hover:prose-a:text-[var(--color-brand-accent)]
              prose-img:rounded-[1.5rem] prose-img:border prose-img:border-border/60 prose-img:shadow-card
              prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-8 prose-blockquote:rounded-2xl
            "
            dangerouslySetInnerHTML={{ __html: blog.content_html || "" }}
          />
        </motion.div>
      </div>
    </div>
  );
}
