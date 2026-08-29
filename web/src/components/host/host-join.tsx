"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";

export function HostJoin({ origin, roundId }: { origin: string; roundId: bigint }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const joinUrl = new URL(`/?round=${roundId}`, origin).toString();

  const copy = async () => {
    if (!joinUrl) return;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <section className="host-join" aria-labelledby="join-title">
      <div>
        <h3 id="join-title">Scan to join</h3>
        <div className="join-qr">
          <QRCodeSVG
            value={joinUrl}
            size={248}
            bgColor="#ffffff"
            fgColor="#09090d"
            level="M"
            marginSize={2}
            title={`Join TAPACITY round ${roundId.toString()}`}
          />
        </div>
      </div>
      <div className="join-actions">
        <h3>Share the full link</h3>
        <input aria-label="Full join URL" readOnly value={joinUrl} onFocus={(event) => event.currentTarget.select()} />
        <div>
          <button className="secondary-button host-secondary" onClick={() => void copy()}>{copyState === "copied" ? "Copied" : "Copy link"}</button>
          <button className="secondary-button host-secondary" onClick={() => window.open(joinUrl, "_blank", "noopener,noreferrer")}>Open player view</button>
        </div>
        {copyState === "failed" && <p className="error-note" role="alert">Copy failed. Select the full URL above.</p>}
        {copyState === "copied" && <p className="sr-only" role="status">Join link copied.</p>}
      </div>
    </section>
  );
}
