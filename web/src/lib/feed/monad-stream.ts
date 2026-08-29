export type FeedStatus = "connecting" | "live" | "offline";

export function subscribeMonadStream<T>({
  url,
  subscription,
  filter,
  isResult,
  onResult,
  onStatus,
}: {
  url: string;
  subscription: "monadLogs" | "monadNewHeads";
  filter?: object;
  isResult: (value: unknown) => value is T;
  onResult: (result: T) => void;
  onStatus?: (status: FeedStatus) => void;
}) {
  let stopped = false;
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;

  const connect = () => {
    if (stopped) return;
    onStatus?.("connecting");
    socket = new WebSocket(url);
    socket.onopen = () => {
      onStatus?.("live");
      socket?.send(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_subscribe",
        params: filter ? [subscription, filter] : [subscription],
      }));
    };
    socket.onmessage = (message) => {
      try {
        const result: unknown = JSON.parse(String(message.data))?.params?.result;
        if (isResult(result)) onResult(result);
      } catch {
        // Ignore non-JSON provider frames. Connection state remains visible.
      }
    };
    socket.onclose = () => {
      onStatus?.("offline");
      if (!stopped) retry = setTimeout(connect, 1_000);
    };
    socket.onerror = () => socket?.close();
  };

  connect();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    socket?.close();
  };
}
