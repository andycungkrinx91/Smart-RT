"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { fetchPublicData } from "@/lib/api";

const defaultNavLinks = [
  { name: "Home", href: "/" },
  { name: "Blog", href: "/blogs" },
  { name: "Al Quran", href: "/quran" },
  { name: "Hadist", href: "/hadist" },
  { name: "Waktu Shalat", href: "/shalat" },
  { name: "Tentang", href: "/about" },
];

export default function Footer() {
  const [data, setData] = useState<any>(null);
  const [navLinks, setNavLinks] = useState(defaultNavLinks);
  const [brandName, setBrandName] = useState("Smart RT");
  const [footerDescription, setFooterDescription] = useState(
    "Solusi digital untuk manajemen lingkungan RT/RW yang transparan, efisien, dan aman."
  );

  useEffect(() => {
    async function load() {
      const [globalRes, navigationRes] = await Promise.all([
        fetchPublicData("/public/settings/layout_global"),
        fetchPublicData("/public/settings/layout_navigation"),
      ]);

      if (globalRes && globalRes.value) {
        setData(globalRes.value);
        const globalValue = globalRes.value as {
          footer?: { description?: string };
        };
        if (globalValue.footer?.description) {
          setFooterDescription(globalValue.footer.description);
        }
      }

      if (navigationRes && navigationRes.value) {
        const navValue = navigationRes.value as {
          brand?: { name?: string };
          primary?: Array<{ label?: string; href?: string }>;
        };
        if (navValue.brand?.name) setBrandName(navValue.brand.name);
        const primary = Array.isArray(navValue.primary) ? navValue.primary : [];
        const mappedLinks = primary
          .map((item) => ({
            name: item?.label || "",
            href: item?.href || "",
          }))
          .filter((item) => item.name || item.href);
        setNavLinks(mappedLinks.length > 0 ? mappedLinks : defaultNavLinks);
      }

    }
    load();
  }, []);


  const contact = data?.contact || {
    email: "support@smartrt.id",
    phone: "+62 812 3456 7890",
    address: "Jakarta, Indonesia",
  };

  return (
    <footer className="bg-surface border-t border-border pt-24 pb-12 relative overflow-hidden">
      <div className="ambient-glow bottom-[-200px] left-[-100px] bg-primary/10" />
      
      <div className="container-custom relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-16 mb-20">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-8 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
                <Image src="/logo.svg" alt="Smart RT" width={36} height={36} className="relative z-10" />
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tighter">
                {brandName.split(" ").slice(0, -1).join(" ") || "Smart"}{" "}
                <span className="text-gradient">{brandName.split(" ").slice(-1)[0] || "RT"}</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm font-medium leading-relaxed">
              {footerDescription}
            </p>
          </div>
          
          <div>
            <h4 className="font-black text-slate-900 mb-8 uppercase tracking-widest text-xs">Navigasi</h4>
            <ul className="space-y-5 text-sm font-bold text-slate-500">
              {navLinks.map((link) => (
                <li key={`${link.name}-${link.href}`}>
                  <Link href={link.href} className="hover:text-primary transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

           <div>
             <h4 className="font-black text-slate-900 mb-8 uppercase tracking-widest text-xs">Fitur</h4>
             <ul className="space-y-5 text-sm font-bold text-slate-500">
               <li>Manajemen Iuran</li>
               <li>Data Warga</li>
               <li>Laporan Keuangan</li>
               <li>Kegiatan Lingkungan</li>
             </ul>
           </div>

           <div>
             <h4 className="font-black text-slate-900 mb-8 uppercase tracking-widest text-xs">Kontak</h4>
             <ul className="space-y-5 text-sm font-bold text-slate-500">
               <li>{contact.email}</li>
               <li>{contact.phone}</li>
               <li>{contact.address}</li>
             </ul>
           </div>
        </div>
        
        <div className="border-t border-border pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            Andy Setiyawan 2026 ™
            <br />
            <span className="footer-accent">Smart RT Workspace</span>
          </p>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-xs font-bold uppercase tracking-widest text-slate-500">
            <Link href="#" className="hover:text-primary transition-colors">Kebijakan Privasi</Link>
            <Link href="#" className="hover:text-primary transition-colors">Syarat & Ketentuan</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
