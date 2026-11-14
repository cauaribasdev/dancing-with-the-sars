/** Wordmark: the radar pulse (ink wave) and the satellite (signal-yellow dot). */
export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <svg aria-hidden viewBox="0 0 34 20" className="h-[18px] w-[30px]">
        <path d="M2 15c3.5-8 7-8 9 0s5.5 8 9 0" fill="none" stroke="var(--color-ink)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="27" cy="6" r="4" fill="var(--color-signal)" stroke="var(--color-ink)" strokeWidth="1.6" />
      </svg>
      <span className="text-[16px] font-[650] tracking-[-0.01em]" style={{ fontStretch: "112%" }}>
        NISAR over Brazil
      </span>
    </span>
  );
}
