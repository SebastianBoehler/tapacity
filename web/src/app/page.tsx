import { isAddress } from "viem";
import { TapacityApp } from "@/components/tapacity-app";
import { RoomPicker } from "@/components/player/room-picker";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { round } = await searchParams;
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;
  const contract = process.env.NEXT_PUBLIC_TAPACITY_CONTRACT;
  const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const alchemyPolicyId = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;
  const roundId = round && /^\d+$/.test(round) ? BigInt(round) : undefined;
  const missing = [
    !appId && "NEXT_PUBLIC_PRIVY_APP_ID",
    !clientId && "NEXT_PUBLIC_PRIVY_CLIENT_ID",
    (!contract || !isAddress(contract)) && "NEXT_PUBLIC_TAPACITY_CONTRACT",
    !alchemyApiKey && "NEXT_PUBLIC_ALCHEMY_API_KEY",
    !alchemyPolicyId && "NEXT_PUBLIC_ALCHEMY_POLICY_ID",
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

  if (!appId || !clientId || !contract || !isAddress(contract) || !alchemyApiKey || !alchemyPolicyId) return null;
  if (roundId === undefined) return <RoomPicker contract={contract} />;
  return <TapacityApp appId={appId} clientId={clientId} contract={contract} roundId={roundId} alchemyApiKey={alchemyApiKey} alchemyPolicyId={alchemyPolicyId} />;
}
