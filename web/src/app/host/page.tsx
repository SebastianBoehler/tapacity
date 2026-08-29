import { isAddress } from "viem";
import { headers } from "next/headers";
import { HostConsole } from "@/components/host/host-console";

export default async function HostPage() {
  const contract = process.env.NEXT_PUBLIC_TAPACITY_CONTRACT;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (!contract || !isAddress(contract)) {
    return <main className="status-screen"><h1>Host unavailable</h1><p>Contract configuration is missing.</p></main>;
  }
  if (!host) return <main className="status-screen"><h1>Host unavailable</h1><p>The public room URL could not be determined.</p></main>;
  return <HostConsole contract={contract} origin={`${protocol}://${host}`} />;
}
