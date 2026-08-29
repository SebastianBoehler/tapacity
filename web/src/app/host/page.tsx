import { isAddress } from "viem";
import { HostConsole } from "@/components/host/host-console";

export default function HostPage() {
  const contract = process.env.NEXT_PUBLIC_TAPACITY_CONTRACT;
  if (!contract || !isAddress(contract)) {
    return <main className="status-screen"><h1>Host unavailable</h1><p>Contract configuration is missing.</p></main>;
  }
  return <HostConsole contract={contract} />;
}
