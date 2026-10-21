export type PublicIdentity = { userId: string; email: string };

export interface GatewaySessionData extends PublicIdentity {
  authenticatedVia: string;
  issuedAt: number;
}

export interface SessionVerificationResult {
  valid: boolean;
  data?: GatewaySessionData;
}

export interface SSOPayload {
  userId: string;
  email: string;
  timestamp: number;
  nonce: string;
  appName: string;
}
export interface VerificationResult {
  valid: boolean;
  error?: string;
  payload?: SSOPayload;
}
