import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, BarChart3, Bell, Settings, Search } from "lucide-react";
import { cn } from "../../lib/cn";
import { fetchAlerts } from "../../api/watchlist";

const NAV_ITEMS = [
  { to: "/", label: "Digest", icon: BookOpen },
  { to: "/watchlist", label: "Watchlist", icon: BarChart3 },
  { to: "/settings", label: "Actions", icon: Settings },
] as const;

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: alertData } = useQuery({
    queryKey: ["alerts", "unread"],
    queryFn: () => fetchAlerts(true),
    refetchInterval: 60_000,
  });
  const unreadCount = alertData?.unread_count ?? 0;

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="font-bold text-lg tracking-tight text-foreground hover:text-primary transition-colors flex-shrink-0"
        >
          Digest
        </Link>

        <div className="flex-1 max-w-xs hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim().length >= 2) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchQuery("");
                }
              }}
              className="w-full pl-10 pr-4 py-1.5 rounded-lg text-sm bg-secondary border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <Link
            to="/search"
            className={cn(
              "flex items-center p-2 rounded-lg text-sm transition-colors md:hidden",
              location.pathname === "/search"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Search className="w-4 h-4" />
          </Link>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? location.pathname === "/" || location.pathname.startsWith("/digests")
                : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <Link
            to="/watchlist?alerts=1"
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
