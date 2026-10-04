import { INSTRUMENTS } from "@/lib/constants/instruments";
import { getQuotes } from "@/lib/services/marketData";
import { CurrencyCardGrid, type CurrencyCardItem } from "@/components/market/CurrencyCardGrid";

export default async function DashboardPage() {
  const quotes = await getQuotes();

  const items: CurrencyCardItem[] = INSTRUMENTS.map((instrument) => ({
    instrument,
    quote: quotes.find((quote) => quote.symbol === instrument.symbol) ?? null,
  }));

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold tracking-tight">Market Overview</h2>
          <p className="text-sm text-muted-foreground">Majors and gold — current price, daily change and bias.</p>
        </div>
        <CurrencyCardGrid items={items} />
      </section>
    </div>
  );
}
