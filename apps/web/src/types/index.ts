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
