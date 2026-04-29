export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          © {new Date().getFullYear()} TRIVO VPN ELITE — Stealth tunneling for sovereign users.
        </p>
        <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
          Demo build · VLESS / Xray-core · WebSocket :443 · AES-256-GCM
        </p>
      </div>
    </footer>
  );
}
