type ViewPlaceholderProps = {
  title: string;
  eyebrow: string;
  description: string;
  bullets: string[];
};

export function ViewPlaceholder({
  title,
  eyebrow,
  description,
  bullets,
}: ViewPlaceholderProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white/85 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04),0_24px_80px_rgba(15,23,42,0.06)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
          {description}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {bullets.map((bullet) => (
          <div
            key={bullet}
            className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 shadow-sm"
          >
            {bullet}
          </div>
        ))}
      </div>
    </section>
  );
}