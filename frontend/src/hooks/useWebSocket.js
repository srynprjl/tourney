import { useEffect, useRef, useState } from 'react';

export const useWebSocket = (room) => {
  const [lastMessage, setLastMessage] = useState(null);
  const ws = useRef(null);

  useEffect(() => {
    if (!room) return;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host === 'localhost:3000' ? 'localhost:8080' : window.location.host;
      ws.current = new WebSocket(`${protocol}//${host}/api/realtime/ws/${room}`);

      ws.current.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        setLastMessage(msg);
      };

      ws.current.onclose = () => {
        setTimeout(connect, 3000); // Reconnect
      };
    };

    connect();

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [room]);

  return lastMessage;
};
