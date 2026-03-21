import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Shell from "./components/layout/shell";
import DashboardPage from "./pages/dashboard";
import DigestPage from "./pages/digest";
import WatchlistPage from "./pages/watchlist";
import StockPage from "./pages/stock";
import ResearchPage from "./pages/research";
import SearchPage from "./pages/search";
import SettingsPage from "./pages/settings";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function DefaultLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

function FullWidthLayout() {
  return (
    <Shell fullWidth>
      <Outlet />
    </Shell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Full-width layout for stock pages */}
          <Route element={<FullWidthLayout />}>
            <Route path="/stock/:ticker" element={<StockPage />} />
          </Route>

          {/* Default constrained layout for everything else */}
          <Route element={<DefaultLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/digests" element={<DigestPage />} />
            <Route path="/digests/:id" element={<DigestPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/research/:ticker" element={<ResearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
