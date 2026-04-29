import { Link } from "react-router-dom";
import { MasterVpnLogo } from "./Logo";

export function SiteHeader() {
  const navItems = [
    { to: "/" as const, label: "Home" },
    { to: "/features" as const, label: "Features" },
    { to: "/app" as const, label: "Live Demo" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <MasterVpnLogo />
        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-neon" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="text-sm font-medium transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/app"
          className="rounded-md border border-neon/50 bg-neon/10 px-4 py-2 text-sm font-semibold text-neon transition hover:bg-neon/20 hover:glow-neon"
        >
          Launch App
        </Link>
      </div>
    </header>
  );
}
