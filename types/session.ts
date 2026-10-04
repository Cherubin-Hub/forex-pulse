export type SessionId = "ASIAN" | "LONDON" | "NEW_YORK";

export type SessionDefinition = {
  id: SessionId;
  name: string;      // "London"
  city: string;      // "London"
  timeZone: string;  // IANA time zone, e.g. "Europe/London"
  openHour: number;  // local hour, 24h format
  closeHour: number; // local hour, 24h format
};

export type SessionStatus = {
  session: SessionDefinition;
  isOpen: boolean;
  opensAt: Date;          // the current or next opening moment
  closesAt: Date;         // the matching closing moment
  progress: number;       // 0 to 1, how far through the session we are
  msUntilChange: number;  // ms until it closes (if open) or opens (if closed)
};
