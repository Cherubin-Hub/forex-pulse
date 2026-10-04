import { Newspaper } from "lucide-react";
import { PagePlaceholder } from "@/components/shared/PagePlaceholder";

export default function NewsPage() {
  return (
    <PagePlaceholder
      icon={Newspaper}
      title="News"
      description="Market-moving headlines and central bank speeches."
      phase="Phase 1"
    />
  );
}
