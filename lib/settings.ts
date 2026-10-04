import type { UserSettings } from "@/lib/schemas/settings";
import type { NewsWindows } from "@/types/calendar";
import { NEWS_SENSITIVITY_OPTIONS } from "@/lib/constants/settings";

export function getNewsWindows(settings: UserSettings): NewsWindows {
  const { preReleaseMinutes, postReleaseMinutes } = NEWS_SENSITIVITY_OPTIONS[settings.newsSensitivity];
  return { preReleaseMinutes, postReleaseMinutes };
}
