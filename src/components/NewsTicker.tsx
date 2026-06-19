interface NewsTickerProps {
  headlines: string[];
}

export default function NewsTicker({ headlines }: NewsTickerProps) {
  if (headlines.length === 0) return null;

  // Duplicate the list so the -50% keyframe loops seamlessly.
  const loop = [...headlines, ...headlines];

  return (
    <div className="w-full overflow-hidden border-b border-gv-border bg-[#0d0d12] py-2.5">
      <div className="animate-ticker flex w-max whitespace-nowrap will-change-transform">
        {loop.map((headline, index) => (
          <span
            key={index}
            className="flex items-center text-sm font-medium text-gv-gold"
            aria-hidden={index >= headlines.length}
          >
            <span className="px-4">{headline}</span>
            <span className="text-gv-gold/50">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
