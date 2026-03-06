"use client";

import { motion } from "framer-motion";
import { ArrowRight, Shield, Users, BarChart3, Calendar, Zap, Globe, Lock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPublicData } from "@/lib/api";

const iconMap: Record<string, any> = {
  Shield: <Shield className="text-primary" size={24} />,
  Users: <Users className="text-primary" size={24} />,
  BarChart3: <BarChart3 className="text-primary" size={24} />,
  Calendar: <Calendar className="text-primary" size={24} />,
  Zap: <Zap className="text-primary" size={24} />,
};

export default function HomePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetchPublicData("/public/settings/page_home");
      if (res && res.value) {
        setData(res.value);
      }
      setLoading(false);
    }
    load();
  }, []);


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const hero = data?.hero || {
    title: "Digitalisasi Lingkungan Anda",
    subtitle: "Smart RT menghadirkan transparansi dan efisiensi untuk manajemen RT sehari-hari.",
  };

  const features = data?.features || [];

  return (
    <div className="overflow-hidden">
      <div className="ambient-glow top-[-100px] left-[-100px] bg-primary/30" />
      <div className="ambient-glow bottom-[-200px] right-[-100px] bg-brand-accent/20" />

      <section className="relative py-20 lg:py-32">
        <div className="container-custom relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
 
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 leading-[1] mb-8 tracking-tighter">
                {hero.title.split(' ').map((word: string, i: number) => 
                  word.toLowerCase() === 'community' || word.toLowerCase() === 'lingkungan' ? 
                  <span key={i} className="text-gradient">{word} </span> : word + ' '
                )}
              </h1>
              
              <p className="text-xl text-slate-700/80 leading-relaxed mb-12 max-w-xl font-medium">
                {hero.subtitle}
              </p>
              
              <div className="flex flex-wrap gap-6">
                <Link href="/about" className="btn-nft-primary group">
                  Mulai
                  <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
                <Link href="/blogs" className="btn-nft-outline">
                  Lihat Berita
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-brand-accent/20 blur-3xl rounded-full -z-10 animate-pulse" />
              <div className="bg-surface/70 backdrop-blur-sm p-6 rounded-[2rem] border border-border shadow-card relative overflow-hidden group">
                <div className="aspect-[4/5] bg-background rounded-[1.5rem] overflow-hidden relative border border-border">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-brand-accent flex items-center justify-center mb-8 shadow-glow animate-float">
                      <Globe className="text-white" size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-4">Dashboard Smart RT</h3>
                    <p className="text-slate-500 text-sm font-medium">Analitik real-time dan administrasi otomatis dalam satu tempat.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {features.length > 0 && (
        <section className="py-32 relative">
          <div className="container-custom relative z-10">
            <div className="text-center max-w-3xl mx-auto mb-24">
              <h2 className="text-4xl lg:text-6xl font-black mb-8 tracking-tighter">
                Fitur <span className="text-gradient">Unggulan</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature: any, idx: number) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.6 }}
                  className="nft-card group p-6"
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:shadow-glow transition-all duration-500">
                    <div className="group-hover:text-white transition-colors duration-500">
                      {iconMap[feature.icon] || <Zap size={24} />}
                    </div>
                  </div>
                  <h3 className="text-2xl font-black mb-4 text-slate-900">{feature.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
