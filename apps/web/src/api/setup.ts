import { apiFetch } from "./client";

export interface SetupStatus {
  substack_connected: boolean;
  gemini_configured: boolean;
  market_data_configured: boolean;
}

export function fetchSetupStatus(): Promise<SetupStatus> {
  return apiFetch("/setup/status");
}
