export function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Aurora blob'ları */}
      <div className="absolute -top-40 -left-32 h-[40rem] w-[40rem] rounded-full bg-brand-600/30 blur-[120px] animate-aurora" />
      <div className="absolute top-1/3 -right-32 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/25 blur-[120px] animate-aurora [animation-delay:-6s]" />
      <div className="absolute bottom-0 left-1/4 h-[32rem] w-[32rem] rounded-full bg-cyan-500/20 blur-[120px] animate-aurora [animation-delay:-12s]" />

      {/* İnce grid dokusu */}
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
    </div>
  );
}
