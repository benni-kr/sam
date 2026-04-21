type ViewPlaceholderProps = {
  bullets: string[];
};

export function ViewPlaceholder({ bullets }: ViewPlaceholderProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6">
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
