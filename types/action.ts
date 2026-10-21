export interface UpdateStatusResult {
  success: boolean;
  error?: string;
}
import type { SessionType, SessionReport } from "./report";
export interface ReportActionResult {
  success: boolean;
  data?: SessionReport;
  error?: string;
}
export interface AutoReportResult {
  success: boolean;
  generated: boolean;
  session?: SessionType;
  report?: SessionReport;
  error?: string;
}
export interface HeadlessCycleResult {
  success: boolean;
  timestamp: string;
  scannedSymbols: number;
  opportunitiesFound: number;
  setupsCreated: number;
  setupsUpdated: number;
  activeUsersCount: number;
  durationMs: number;
  error?: string;
}
