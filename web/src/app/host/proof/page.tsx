import { isAddress } from "viem";
import { HostProof } from "@/components/host/host-proof";

export default async function HostProofPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const contract = process.env.NEXT_PUBLIC_TAPACITY_CONTRACT;
  const { round } = await searchParams;
  if (!contract || !isAddress(contract)) return <main className="status-screen"><h1>Proof unavailable</h1><p>Contract configuration is missing.</p></main>;
  if (!round || !/^\d+$/.test(round)) return <main className="status-screen"><h1>Proof unavailable</h1><p>Choose a settled round from the host view.</p></main>;
  return <HostProof contract={contract} roundId={BigInt(round)} />;
}
