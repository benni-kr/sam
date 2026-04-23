"use client";

import Link from "next/link";
import { Hammer, Rocket } from "lucide-react";

export default function WeekStubPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white/50 rounded-[2rem] border border-dashed border-slate-300">
      <div className="bg-slate-100 p-4 rounded-full mb-4">
        <Hammer className="h-12 w-12 text-slate-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        Weekly Schedule
      </h1>
      <p className="mt-2 text-slate-600 max-w-md">
        This feature is currently a stub. We envision a weekly grid here for
        recurring courses, sports, and routines.
      </p>

      <div className="mt-8 p-6 bg-slate-900 rounded-2xl text-white shadow-xl">
        <h2 className="font-semibold flex items-center justify-center gap-2">
          <Rocket size={20} /> Dev Challenge
        </h2>
        <p className="text-sm text-slate-300 mt-2">
          Think you can build a Monday-first weekly grid?
          <br />
          Grab a branch and show us what you&apos;ve got.
        </p>
        <a
          href="https://github.com/benni-kr/sam"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors"
        >
          View Issues & PRs
        </a>
      </div>

      <Link
        href="/"
        className="mt-8 text-sm text-slate-500 underline underline-offset-4 hover:text-slate-900"
      >
        Back to Calendar
      </Link>
    </div>
  );
}
