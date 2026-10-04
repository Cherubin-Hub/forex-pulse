export default function DashboardPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"].map((pair) => (
        <div
          key={pair}
          className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
        >
          <p className="text-sm text-muted-foreground">{pair}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">—</p>
        </div>
      ))}
    </div>
  );
}
