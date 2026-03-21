export interface Article {
  id: number;
  title: string;
  author: string;
  publication: string;
  url: string;
  summary_html: string;
  summary_raw: string;
  category: string | null;
  reading_time_minutes: number;
  word_count: number;
  position: number;
}

export interface DigestSummary {
  id: number;
  date: string;
  overview: string;
  article_count: number;
  created_at: string;
}

export interface DigestDetail extends DigestSummary {
  articles: Article[];
}

export interface DigestListResponse {
  digests: DigestSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface ArticleSearchResponse {
  articles: Article[];
  total: number;
  page: number;
  page_size: number;
}

export interface WatchlistEntry {
  ticker: string;
  company: string;
  price_at_mention: number | null;
  current_price: number | null;
  reasoning: string;
  article_url: string;
  article_title: string;
  publication: string;
  author: string;
  mention_date: string;
  sector: string | null;
  market_cap: number | null;
  conviction: string | null;
  target_price: number | null;
  notes: string | null;
  price_updated_at: string | null;
  price_change_pct: number | null;
}

export interface WatchlistResponse {
  entries: WatchlistEntry[];
  total: number;
}


export interface AlertItem {
  id: number;
  ticker: string;
  alert_type: string;
  message: string;
  is_read: boolean;
  triggered_price: number | null;
  target_price: number | null;
  created_at: string;
}

export interface AlertListResponse {
  alerts: AlertItem[];
  unread_count: number;
}

export interface JobResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface JobProgress {
  status: string;
  progress_pct: number;
  current_step: string;
  result_message: string | null;
  error_message: string | null;
}

export interface StockResearch {
  ticker: string;
  company: string;
  share_price: number | null;
  market_cap: number | null;
  enterprise_value: number | null;
  financials: {
    years: FinancialYear[];
    revenue_segments: Record<string, number> | null;
  } | null;
  price_history: PricePoint[] | null;
  business_overview: {
    summary: string;
    sector: string | null;
    industry: string | null;
    employees: number | null;
    revenue_segments?: Record<string, number>;
  } | null;
  management: {
    ceo: Officer | null;
    cfo: Officer | null;
    all_officers: Officer[];
    major_holders: Record<string, string>;
  } | null;
  insider_activity: InsiderTransaction[] | null;
  superinvestors: SuperinvestorHolding[] | null;
  headwinds_tailwinds: {
    headwinds: string[];
    tailwinds: string[];
    recent_catalysts: string;
    transcript_date: string;
    transcript_quarter: string;
    transcript_year: string;
  } | null;
  options_data: {
    leap_dates: string[];
    all_option_dates: string[];
  } | null;
  auditor: string | null;
  last_refreshed: string | null;
}

export interface FinancialYear {
  year: string;
  revenue: number | null;
  ebitda: number | null;
  ebit: number | null;
  net_income: number | null;
  eps: number | null;
  fcf: number | null;
  ebitda_margin: number | null;
  ebit_margin: number | null;
  net_margin: number | null;
  fcf_margin: number | null;
  fcf_per_share: number | null;
  dso: number | null;
  operating_cf?: number | null;
}

export interface PricePoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Officer {
  name: string;
  title: string;
  age: number | null;
  total_pay: number | null;
}

export interface InsiderTransaction {
  insider: string;
  relation: string;
  transaction: string;
  date: string;
  shares: string;
  value: string;
}

export interface SuperinvestorHolding {
  manager: string;
  pct_of_portfolio: string;
  activity: string;
  reported_price: string;
}

// Balance Sheet
export interface BalanceSheetYear {
  year: string;
  total_assets: number | null;
  total_liabilities: number | null;
  total_equity: number | null;
  total_debt: number | null;
  net_debt: number | null;
  cash: number | null;
}

// Analyst Estimates
export interface AnalystEstimate {
  year: string;
  estimated_revenue: number | null;
  estimated_eps: number | null;
  num_analysts_revenue: number | null;
  num_analysts_eps: number | null;
}

// AI Analysis
export interface AIAnalysis {
  investment_summary: string;
  bull_case: string[];
  bear_case: string[];
  risk_rating: "Low" | "Medium" | "High";
  risk_factors: string[];
  key_metrics_commentary: Record<string, string>;
}

// Stock Profile types
export interface StockProfile {
  ticker: string;
  company: string;
  share_price: number | null;
  market_cap: number | null;
  enterprise_value: number | null;
  overview: StockOverview | null;
  price_history: PricePoint[] | null;
  has_research: boolean;
  research: StockResearchData | null;
  watchlist?: WatchlistInfo;
}

export interface WatchlistInfo {
  on_watchlist: boolean;
  conviction?: string | null;
  target_price?: number | null;
  notes?: string | null;
  price_at_mention?: number | null;
}

export interface StockOverview {
  profile: StockProfileInfo;
  statistics: StockStatistics;
  margins: StockMargins;
  valuation: StockValuation;
  returns: StockReturns;
  growth: StockGrowth;
  dividends: StockDividends;
  financial_health: StockFinancialHealth;
  revenue_segments?: Record<string, number>;
  financials?: { years: FinancialYear[] } | null;
  balance_sheet?: BalanceSheetYear[];
  analyst_estimates?: AnalystEstimate[];
  fetched_at?: string;
}

export interface StockProfileInfo {
  description: string;
  ceo: string;
  website: string;
  sector: string;
  industry: string;
  employees: number | null;
  ipo_date: string;
  exchange: string;
  country: string;
  currency: string;
  company_name: string;
  image: string;
}

export interface StockStatistics {
  market_cap: number | null;
  price: number | null;
  beta: number | null;
  vol_avg: number | null;
  range: string;
  changes: number | null;
  change_percentage: number | null;
  shares_outstanding: number | null;
  last_dividend: number | null;
  enterprise_value: number | null;
  revenue_per_share: number | null;
  net_income_per_share: number | null;
}

export interface StockMargins {
  gross: number | null;
  ebitda: number | null;
  operating: number | null;
  net: number | null;
  fcf: number | null;
}

export interface StockValuation {
  pe: number | null;
  pb: number | null;
  ps: number | null;
  pfcf: number | null;
  ev_to_sales: number | null;
  ev_to_ebitda: number | null;
  dividend_yield: number | null;
  payout_ratio: number | null;
}

export interface StockReturns {
  roa: number | null;
  roe: number | null;
  roic: number | null;
  roce: number | null;
}

export interface StockGrowth {
  revenue_growth_yoy: number | null;
  eps_growth_yoy: number | null;
  net_income_growth_yoy: number | null;
  revenue_growth_3yr: number | null;
  revenue_growth_5yr: number | null;
  eps_growth_3yr: number | null;
  eps_growth_5yr: number | null;
  dividends_growth_yoy: number | null;
}

export interface StockDividends {
  yield: number | null;
  payout_ratio: number | null;
  dps: number | null;
  dps_growth: number | null;
}

export interface StockFinancialHealth {
  current_ratio: number | null;
  quick_ratio: number | null;
  debt_to_equity: number | null;
  interest_coverage: number | null;
  cash_per_share: number | null;
}

export interface StockResearchData {
  financials: {
    years: FinancialYear[];
    revenue_segments: Record<string, number> | null;
  } | null;
  headwinds_tailwinds: {
    headwinds: string[];
    tailwinds: string[];
    recent_catalysts: string;
    transcript_date: string;
    transcript_quarter: string;
    transcript_year: string;
  } | null;
  management: {
    ceo: Officer | null;
    cfo: Officer | null;
    all_officers: Officer[];
    major_holders: Record<string, string>;
  } | null;
  insider_activity: InsiderTransaction[] | null;
  superinvestors: SuperinvestorHolding[] | null;
  business_overview: {
    summary: string;
    sector: string | null;
    industry: string | null;
    employees: number | null;
    revenue_segments?: Record<string, number>;
  } | null;
  options_data: {
    leap_dates: string[];
    all_option_dates: string[];
  } | null;
  auditor: string | null;
  ai_analysis: AIAnalysis | null;
  last_refreshed: string | null;
}

export interface QuarterlyFinancials {
  income_cashflow: QuarterlyPeriod[];
  balance_sheet: QuarterlyBalanceSheet[];
}

export interface QuarterlyPeriod {
  year: string;
  period: string;
  revenue: number | null;
  ebitda: number | null;
  ebit: number | null;
  net_income: number | null;
  eps: number | null;
  fcf: number | null;
  operating_cf: number | null;
}

export interface QuarterlyBalanceSheet {
  year: string;
  period: string;
  total_assets: number | null;
  total_liabilities: number | null;
  total_equity: number | null;
  total_debt: number | null;
  net_debt: number | null;
  cash: number | null;
}

export interface StockArticle {
  id: number;
  title: string;
  author: string;
  publication: string;
  url: string;
  summary_html: string;
  category: string | null;
  reading_time_minutes: number;
  digest_date: string;
}

export interface StockArticlesResponse {
  articles: StockArticle[];
  total: number;
}

export interface TickerSearchResult {
  ticker: string;
  company_name: string;
  exchange: string | null;
}

export interface TickerSearchResponse {
  results: TickerSearchResult[];
}

export interface ResearchListItem {
  ticker: string;
  company: string;
  share_price: number | null;
  market_cap: number | null;
  last_refreshed: string | null;
}

export interface ResearchListResponse {
  items: ResearchListItem[];
  total: number;
}
