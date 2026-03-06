"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { fetchPublicData } from "@/lib/api";

const defaultNavLinks = [
  { name: "Beranda", href: "/" },
  { name: "Blog", href: "/blogs" },
  { name: "Al Quran", href: "/quran" },
  { name: "Hadist", href: "/hadist" },
  { name: "Waktu Shalat", href: "/shalat" },
  { name: "Tentang Kami", href: "/about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [navLinks, setNavLinks] = useState(defaultNavLinks);
  const pathname = usePathname();

  const isRouteActive = (href: string) => {
    const normalizedHref = href.length > 1 ? href.replace(/\/+$/, "") : href;
    const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

    if (normalizedHref === "/") return normalizedPath === "/";
    return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function load() {
      const res = await fetchPublicData("/public/settings/layout_navigation");
      if (res && res.value) {
        const value = res.value as {
          primary?: Array<{ label?: string; href?: string }>;
        };
        const primary = Array.isArray(value.primary) ? value.primary : [];
        const mappedLinks = primary
          .map((item) => ({
            name: item?.label || "",
            href: item?.href || "",
          }))
          .filter((item) => item.name || item.href);

        const base = mappedLinks.length > 0 ? mappedLinks : defaultNavLinks;
        const hasQuran = base.some((l) => l.href === "/quran");
        const hasHadist = base.some((l) => l.href === "/hadist");
        const hasShalat = base.some((l) => l.href === "/shalat");
        const withQuran = hasQuran ? base : [...base, { name: "Al Quran", href: "/quran" }];
        const withHadist = hasHadist ? withQuran : [...withQuran, { name: "Hadist", href: "/hadist" }];
        setNavLinks(hasShalat ? withHadist : [...withHadist, { name: "Waktu Shalat", href: "/shalat" }]);
      }
    }
    load();
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-300 ${
        scrolled ? "glass-nav glass-nav-scrolled shadow-header" : "glass-nav"
      }`}
      style={{ transform: "translateZ(0)" }}
    >
      <div className="container-custom flex h-[var(--header-h)] items-center justify-between">

        <Link href="/" className="group flex h-full items-center gap-3">
          <Image
            src="/logo.svg"
            alt="Smart RT"
            width={96}
            height={96}
            className="h-[4.5rem] w-auto sm:h-[5rem] lg:h-[5.5rem] object-contain"
            priority
          />
          <div className="flex flex-col leading-none">
            <span className="text-lg font-black text-white tracking-tight sm:text-2xl">Smart RT</span>
            <span className="relative mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white [text-shadow:0_0_3px_rgba(255,255,255,0.35)] sm:text-[11px]">
              Digital Platform
              <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-white shadow-[0_0_3px_rgba(255,255,255,0.45)]" />
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-2">
          {navLinks.map((link) => {
            const active = isRouteActive(link.href);
            return (
              <Link
                key={`${link.name}-${link.href}`}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`header-nav-item ${active ? "header-nav-item-active" : "header-nav-item-idle"}`}
              >
                {link.name}
              </Link>
            );
          })}

          <Link
            href="/settings/theme"
            aria-current={isRouteActive("/settings/theme") ? "page" : undefined}
            className={`header-nav-item ${
              isRouteActive("/settings/theme") ? "header-nav-item-active" : "header-nav-item-idle"
            }`}
          >
            Tema
          </Link>
        </div>
      </div>
    </nav>
  );
}
