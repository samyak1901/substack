import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  FlaskConical,
  Home,
  Settings,
} from "lucide-react";

export const PRODUCT_NAME = "Signal Desk";
export const PRODUCT_TAGLINE =
  "Turn subscription research into digests, stock ideas, and decision-ready analysis.";

export const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/digests", label: "Digests", icon: BookOpen, exact: false },
  { to: "/watchlist", label: "Watchlist", icon: BarChart3, exact: false },
  { to: "/research", label: "Research", icon: FlaskConical, exact: false },
  { to: "/settings", label: "Jobs", icon: Settings, exact: false },
] as const;

export const WORKFLOW_STEPS = [
  {
    title: "Read",
    description: "Generate a digest from recent Substack posts.",
    href: "/digests",
    icon: BookOpen,
  },
  {
    title: "Extract",
    description: "Convert stock pitches into a tracked watchlist.",
    href: "/watchlist",
    icon: BriefcaseBusiness,
  },
  {
    title: "Research",
    description: "Deep-dive any ticker with financials and AI analysis.",
    href: "/research",
    icon: FlaskConical,
  },
] as const;
