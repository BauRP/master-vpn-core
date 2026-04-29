import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-neon text-glow">404</h1>
        <h2 className="mt-4 font-display text-xl font-semibold">Page not found</h2>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          // ROUTE_NOT_RESOLVED
        </p>
        <div className="mt-6">
          <Link
            to="/app"
            className="inline-flex items-center justify-center rounded-md border border-neon/50 bg-neon/10 px-4 py-2 text-sm font-semibold text-neon hover:bg-neon/20 hover:glow-neon"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
