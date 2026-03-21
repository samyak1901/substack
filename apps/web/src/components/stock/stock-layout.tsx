import type { StockProfile } from "../../types";
import StockSidebar from "./stock-sidebar";

export default function StockLayout({
  profile,
  activeSection,
  onSectionChange,
  children,
}: {
  profile: StockProfile;
  activeSection: string;
  onSectionChange: (section: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <StockSidebar
        profile={profile}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
