"use client";

import { motion } from "framer-motion";
import { Shield, Target, Heart, Users, Globe, Zap, Lock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchPublicData } from "@/lib/api";

const iconMap: Record<string, any> = {
  Shield: <Shield className="text-primary" size={24} />,
  Target: <Target className="text-primary" size={24} />,
  Heart: <Heart className="text-primary" size={24} />,
  Users: <Users className="text-primary" size={24} />,
};

export default function AboutPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetchPublicData("/public/settings/page_about");
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

  const vision = data?.vision || "To create a harmonious and modern neighborhood community.";
  const mission = data?.mission || "Digitalize all neighborhood administrative processes.";
  const story = data?.story || "Smart RT was born from the desire to create a modern, transparent, and easy-to-use neighborhood management system.";

  return (
    <div className="py-24 relative overflow-hidden">
      <div className="ambient-glow bottom-[-100px] left-[-100px] bg-brand-accent/20" />
      
      <div className="container-custom relative z-10">
        <div className="max-w-5xl mx-auto text-center mb-32">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-widest uppercase mb-8"
          >
            <Globe size={14} />
            Misi & Visi
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 mb-10 tracking-tighter leading-[1]"
          >
            Membangun <span className="text-gradient">Lingkungan</span> Lebih Baik Bersama
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl text-slate-700/80 font-medium leading-relaxed max-w-3xl mx-auto"
          >
            {story}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-40">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-surface border border-border p-12 rounded-[2rem] relative overflow-hidden group shadow-card"
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 blur-3xl rounded-full group-hover:bg-primary/10 transition-all" />
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-10">
              <Zap className="text-primary" size={32} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tighter">Visi</h2>
            <p className="text-slate-500 leading-relaxed text-xl font-medium">
              {vision}
            </p>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-primary to-brand-accent p-12 rounded-[2rem] text-white shadow-card relative overflow-hidden group"
          >
            <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-10">
              <Lock className="text-white" size={32} />
            </div>
            <h2 className="text-4xl font-black mb-8 tracking-tighter">Misi</h2>
            <div className="text-white/90 text-xl font-bold whitespace-pre-line">
              {mission}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
