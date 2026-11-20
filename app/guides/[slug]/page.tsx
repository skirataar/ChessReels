import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Target,
  Share2,
} from "lucide-react";
import { CHESS_GUIDES, getGuideBySlug } from "@/lib/guides";
import { PublicFooter } from "@/components/PublicFooter";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return CHESS_GUIDES.map((guide) => ({
    slug: guide.slug,
  }));
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return {
      title: "Tactical Guide Not Found | DoomChess",
    };
  }

  return {
    title: `${guide.title} | DoomChess Tactics`,
    description: guide.summary,
    alternates: {
      canonical: `https://doomchess.online/guides/${guide.slug}`,
    },
    openGraph: {
      title: guide.title,
      description: guide.summary,
      url: `https://doomchess.online/guides/${guide.slug}`,
      type: "article",
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
      siteName: "DoomChess",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.summary,
    },
  };
}

export default async function GuideDetailPage(props: PageProps) {
  const { slug } = await props.params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-[#f5f2eb] flex flex-col justify-between selection:bg-[#c29b78] selection:text-[#0a0908] select-text">
      <article className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12 flex-1">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/[0.06]">
          <Link
            href="/guides"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#c29b78] hover:text-[#dfb48c] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2]" />
            <span>All Tactical Guides</span>
          </Link>

          <Link
            href="/play"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-[#f5f2eb] transition-colors"
          >
            <Target className="w-3.5 h-3.5 text-[#c29b78]" />
            <span>Practice Board</span>
          </Link>
        </div>

        {/* Article Header */}
        <header className="mb-10 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-[#c29b78]/15 border border-[#c29b78]/30 text-[#c29b78] font-semibold">
              {guide.category}
            </span>
            <div className="flex items-center gap-3 text-zinc-500 font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {guide.readTime}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Updated {guide.updatedAt}
              </span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#f5f2eb] leading-tight">
            {guide.title}
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed">
            {guide.subtitle}
          </p>

          <div className="p-4 rounded-xl bg-[#12100e] border border-white/[0.08] text-xs text-zinc-300 leading-relaxed italic">
            &ldquo;{guide.summary}&rdquo;
          </div>
        </header>

        {/* Article Body Sections */}
        <div className="space-y-10 text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
          {guide.sections.map((section, index) => (
            <section key={index} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-[#f5f2eb] tracking-tight">
                  {section.heading}
                </h2>
                {section.subheading && (
                  <h3 className="text-xs font-semibold text-[#c29b78] uppercase tracking-wider font-mono">
                    {section.subheading}
                  </h3>
                )}
              </div>

              {section.paragraphs.map((para, pIdx) => (
                <p key={pIdx} className="leading-relaxed text-zinc-300">
                  {para}
                </p>
              ))}

              {section.keyTakeaways && section.keyTakeaways.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#141210] border border-[#c29b78]/25 space-y-2.5 my-4">
                  <div className="flex items-center gap-2 text-[#c29b78] font-bold text-xs uppercase font-mono tracking-wider">
                    <Lightbulb className="w-4 h-4 shrink-0" />
                    <span>Tactical Core Principles</span>
                  </div>
                  <ul className="space-y-2 text-xs text-zinc-300">
                    {section.keyTakeaways.map((takeaway, tIdx) => (
                      <li key={tIdx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#c29b78] shrink-0 mt-0.5" />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}

          {/* Practical Checklist Box */}
          {guide.practicalTips && guide.practicalTips.length > 0 && (
            <section className="p-6 rounded-2xl bg-[#161311] border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center gap-2.5 text-[#c29b78] font-bold text-sm">
                <Target className="w-4 h-4 shrink-0" />
                <span>Tactical Training Checklist</span>
              </div>
              <p className="text-xs text-zinc-400">
                Integrate these principles into your rapid calculation routine on the puzzle feed:
              </p>
              <ul className="space-y-2.5 text-xs text-zinc-200">
                {guide.practicalTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-[#c29b78]/20 text-[#c29b78] flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Bottom CTA to practice */}
        <div className="mt-14 pt-8 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-[#12100e] border border-[#c29b78]/30">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-xs font-bold text-[#c29b78] font-mono uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Practice This Motif</span>
            </div>
            <div className="text-sm font-bold text-white">
              Ready to test your pattern recognition?
            </div>
            <p className="text-xs text-zinc-400 max-w-sm">
              Jump into the DoomChess feed and solve real game positions featuring this tactical theme.
            </p>
          </div>

          <Link
            href="/play"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#c29b78] hover:bg-[#d4b08f] text-[#0a0908] font-bold text-xs sm:text-sm tracking-wide transition-all shadow-lg shadow-[#c29b78]/20 flex items-center justify-center gap-2 shrink-0 active:scale-[0.98]"
          >
            <Target className="w-4 h-4 stroke-[2]" />
            <span>Launch Tactical Feed</span>
          </Link>
        </div>
      </article>

      <PublicFooter />
    </div>
  );
}
