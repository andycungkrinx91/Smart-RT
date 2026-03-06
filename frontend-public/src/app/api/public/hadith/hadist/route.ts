import { NextResponse } from "next/server";

const HADITH_API_BASE_URL = "https://hadeethenc.com/api/v1";
const MAX_PER_PAGE = 20;

interface HadithListItem {
  id: string;
  title: string;
  translations: string[];
}

interface HadithListResponse {
  items: HadithListItem[];
  pagination: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
    has_prev: boolean;
    has_next: boolean;
  };
}

interface HadithListPayload {
  data?: unknown;
  meta?: {
    current_page?: unknown;
    last_page?: unknown;
    total_items?: unknown;
    per_page?: unknown;
  };
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const intValue = Math.trunc(parsed);
  return intValue > 0 ? intValue : fallback;
}

function parseHadithItems(payload: unknown): HadithListItem[] {
  const source =
    Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: unknown[] }).data
        : [];

  return source
    .map<HadithListItem | null>((item) => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const id = String(obj.id ?? "").trim();
      const title = String(obj.title ?? "").trim();

      if (!id || !title) return null;

      const translations = Array.isArray(obj.translations)
        ? obj.translations.filter((translation): translation is string => typeof translation === "string")
        : [];

      return { id, title, translations };
    })
    .filter((item): item is HadithListItem => item !== null);
}

export async function GET(_req: Request) {
  const { searchParams } = new URL(_req.url);
  const categoryId = searchParams.get("category_id") || "1";
  const requestedPage = parsePositiveInt(searchParams.get("page"), 1);
  const requestedPerPage = parsePositiveInt(searchParams.get("per_page"), MAX_PER_PAGE);
  const perPage = Math.min(requestedPerPage, MAX_PER_PAGE);
  const upstreamUrl = new URL(`${HADITH_API_BASE_URL}/hadeeths/list/`);
  upstreamUrl.searchParams.set("language", "id");
  upstreamUrl.searchParams.set("category_id", categoryId);
  upstreamUrl.searchParams.set("page", String(requestedPage));
  upstreamUrl.searchParams.set("per_page", String(perPage));

  try {
    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: { accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      return NextResponse.json({ message: "Gagal mengambil daftar hadist" }, { status: response.status });
    }

    const payload = (await response.json().catch(() => null)) as HadithListPayload | null;
    const items = parseHadithItems(payload);
    const currentPage = parsePositiveInt(String(payload?.meta?.current_page ?? ""), requestedPage);
    const totalPages = parsePositiveInt(String(payload?.meta?.last_page ?? ""), currentPage);
    const totalItems = parsePositiveInt(String(payload?.meta?.total_items ?? ""), items.length);
    const responsePerPage = parsePositiveInt(String(payload?.meta?.per_page ?? ""), perPage);

    const body: HadithListResponse = {
      items,
      pagination: {
        page: currentPage,
        per_page: responsePerPage,
        total_items: totalItems,
        total_pages: totalPages,
        has_prev: currentPage > 1,
        has_next: currentPage < totalPages,
      },
    };

    return NextResponse.json(body);
  } catch {
    return NextResponse.json({ message: "Layanan Hadist tidak tersedia" }, { status: 502 });
  }
}
