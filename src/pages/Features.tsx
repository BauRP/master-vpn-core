import { SiteHeader } from "@/components/mastervpn/SiteHeader";
import { SiteFooter } from "@/components/mastervpn/SiteFooter";

const stack = [
  { label: "ENGINE", value: "Xray-core (libv2ray)" },
  { label: "PROTOCOL", value: "VLESS (active)" },
  { label: "TRANSPORT", value: "WebSocket / TLS-mimic" },
  { label: "PORT", value: "443" },
  { label: "CIPHER", value: "AES-256-GCM" },
  { label: "DNS", value: "Private Encrypted" },
  { label: "PLATFORM", value: "Android 16 / API 36" },
  { label: "PERSISTENCE", value: "RAM-only" },
];

const protocols = [
  { name: "VLESS", state: "ACTIVE", note: "Lightweight, low-overhead, perfect over WS:443" },
  { name: "WireGuard", state: "READY", note: "Kernel-grade speed for trusted networks" },
  { name: "Shadowsocks", state: "READY", note: "Classic obfuscation, proven worldwide" },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-6 py-20">
        <p className="font-mono text-xs tracking-widest text-neon">// TECHNICAL DOSSIER</p>
        <h1 className="mt-3 font-display text-5xl font-bold">The stealth engine.</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Every layer is engineered to be invisible to deep packet inspection while keeping zero forensic footprint
          on the device.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-8">
            <h2 className="mb-6 font-display text-2xl font-semibold">Stack Manifest</h2>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
              {stack.map((s) => (
                <div key={s.label} className="bg-card p-4">
                  <dt className="font-mono text-[10px] tracking-widest text-muted-foreground">{s.label}</dt>
                  <dd className="mt-1 font-mono text-sm text-neon">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8">
            <h2 className="mb-6 font-display text-2xl font-semibold">Protocols</h2>
            <ul className="space-y-3">
              {protocols.map((p) => (
                <li key={p.name} className="flex items-start gap-4 rounded-lg border border-border bg-background p-4">
                  <div className={`mt-1 h-2 w-2 rounded-full ${p.state === "ACTIVE" ? "bg-success animate-glow" : "bg-muted-foreground/40"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-display font-semibold">{p.name}</span>
                      <span className={`font-mono text-[10px] tracking-widest ${p.state === "ACTIVE" ? "text-success" : "text-muted-foreground"}`}>
                        [{p.state}]
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-8">
          <h2 className="mb-2 font-display text-2xl font-semibold">Hardcoded Entry Point</h2>
          <p className="text-sm text-muted-foreground">Primary VLESS URI bundled in the build:</p>
          <pre className="mt-4 overflow-x-auto rounded-lg border border-neon/20 bg-background p-4 font-mono text-xs text-neon">
{`vless://c5edbbe2-c7af-467b-e185-5b6b941877bd@443:25812?type=ws&security=none&path=%2F#Master VPN_VPN`}
          </pre>
          <p className="mt-3 font-mono text-[10px] text-muted-foreground">
            // Note: real tunneling requires the native Android build. This web UI is a presentation surface.
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
