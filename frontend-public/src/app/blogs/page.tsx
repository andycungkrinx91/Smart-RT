"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar, User, ArrowRight, Search, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
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

function firstImageFromHtml(html: string | null) {
  if (!html) return null;
  const match = html.match(/<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  const src = match?.[1]?.trim();
  return src ? src : null;
}

function stripHtml(html: string) {
  const withoutFilenameSpans = html.replace(
    /<span[^>]*>\s*[^<]*\.(webp|jpe?g|png|gif|svg)\s*<\/span>/gi,
    ' ',
  );
  const noTags = withoutFilenameSpans.replace(/<[^>]*>/g, ' ');
  const keepTrailingWord = noTags.replace(
    /\b\S+\.(webp|jpe?g|png|gif|svg)([A-Za-z]+)/gi,
    (_match, _ext, trailing) => ` ${trailing} `,
  );
  const noImageTokens = keepTrailingWord.replace(/\b\S+\.(webp|jpe?g|png|gif|svg)\b/gi, ' ');
  return noImageTokens.replace(/\s+/g, ' ').trim();
}

function excerptFromHtml(html: string | null, maxLength = 110) {
  if (!html) return "-";
  const plain = stripHtml(html);
  if (!plain) return "-";
  return plain.length <= maxLength ? plain : `${plain.slice(0, maxLength - 3)}...`;
}

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(date);
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetchPublicData("/public/blogs");
      if (Array.isArray(res)) {
        setBlogs(res);
      }
      setLoading(false);
    }
    load();
  }, []);


  const filteredBlogs = blogs.filter(blog => 
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (blog.content_html && stripHtml(blog.content_html).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="py-24 relative overflow-hidden">
      <div className="ambient-glow top-[-100px] right-[-100px] bg-primary/20" />
      
      <div className="container-custom relative z-10">
        <div className="max-w-4xl mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-widest uppercase mb-8"
          >
            Kabar Warga & Informasi
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 mb-8 tracking-tighter"
          >
            Jelajahi <span className="text-gradient">Info</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-700/80 font-medium leading-relaxed"
          >
            Ikuti kabar terbaru seputar kegiatan warga, laporan keuangan, dan pengumuman keamanan.
          </motion.p>
        </div>

        {/* Search Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap items-center gap-6 mb-16"
        >
          <div className="flex-1 min-w-[300px] relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Cari artikel..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-border rounded-full py-4 pl-14 pr-6 text-slate-900 outline-none focus:border-primary/50 focus:shadow-glow transition-all font-medium"
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-xl font-medium">Artikel tidak ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {filteredBlogs.map((blog, idx) => (
              <motion.article
                key={blog.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.6 }}
                className="nft-card group !p-0 overflow-hidden"
              >
                <div className="aspect-[16/10] bg-background relative overflow-hidden">
                  {(() => {
                    const thumb = blog.image_url || firstImageFromHtml(blog.content_html);
                    return thumb ? (
                    <>
                      <Image
                        src={thumb}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover scale-110 blur-xl opacity-40"
                        aria-hidden
                        priority={idx < 3}
                      />
                      <Image
                        src={thumb}
                        alt={blog.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-contain p-4 transition-transform duration-700 group-hover:scale-[1.03]"
                        priority={idx < 3}
                      />
                    </>
                    ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-black text-4xl tracking-tighter opacity-30 group-hover:scale-110 transition-transform duration-700">
                      SMART RT
                    </div>
                    );
                  })()}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-70" />
                </div>
                
                <div className="p-10">
                  <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary" />
                      {formatDate(blog.created_at)}
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-primary" />
                      {blog.created_by}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-900 mb-6 group-hover:text-primary transition-colors leading-tight">
                    {blog.title}
                  </h3>
                  
                  <p className="text-slate-500 text-sm leading-relaxed mb-10 font-medium">
                    {excerptFromHtml(blog.content_html)}
                  </p>
                  
                  <Link 
                    href={`/blogs/${blog.id}`}
                    className="inline-flex items-center text-sm font-black text-primary group/link uppercase tracking-widest"
                  >
                    Read More
                    <ArrowRight className="ml-2 group-hover/link:translate-x-2 transition-transform" size={18} />
                  </Link>
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
