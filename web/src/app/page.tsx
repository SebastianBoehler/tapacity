import { isAddress } from "viem";
import { TapacityApp } from "@/components/tapacity-app";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { round } = await searchParams;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const contract = process.env.NEXT_PUBLIC_TAPACITY_CONTRACT;
  const roundId = round && /^\d+$/.test(round) ? BigInt(round) : undefined;
  const missing = [
    !appId && "NEXT_PUBLIC_PRIVY_APP_ID",
    (!contract || !isAddress(contract)) && "NEXT_PUBLIC_TAPACITY_CONTRACT",
    !roundId && "?round=<roundId>",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return (
      <main className="config-screen">
        <h1>Live path not configured</h1>
        <p>No demo data is substituted. Configure the real deployment and open a real round.</p>
        <ul className="config-list">
          {missing.map((item) => <li key={item}><code>{item}</code></li>)}
        </ul>
      </main>
    );
  }

  if (!appId || !contract || !isAddress(contract) || roundId === undefined) return null;
  return <TapacityApp appId={appId} contract={contract} roundId={roundId} />;
}
