import { Link } from "@tanstack/react-router";

export function MasterVpnLogo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-neon/40 bg-neon/10 glow-neon">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-neon" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2 4 6v6c0 5 3.4 9.3 8 10 4.6-.7 8-5 8-10V6l-8-4Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
        </svg>
      </div>
      <div className="font-display font-semibold tracking-tight">
        <span className="text-foreground">TRIVO</span>
        <span className="text-neon text-glow"> VPN</span>
        <span className="ml-1 rounded border border-neon/30 px-1 py-0.5 font-mono text-[9px] text-neon">ELITE</span>
      </div>
    </Link>
  );
}
