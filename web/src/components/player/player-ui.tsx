export function Header({ roundId, feed }: { roundId: bigint; feed: string }) {
  return (
    <header>
      <b>TAPACITY</b>
      <span>R{roundId.toString()} · Feed {feed}</span>
    </header>
  );
}

export function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function StatusScreen({ label, detail }: { label: string; detail?: string }) {
  return (
    <main className="status-screen">
      <h1>{label}</h1>
      {detail && <p>{detail}</p>}
    </main>
  );
}
