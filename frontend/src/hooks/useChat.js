import { useState, useEffect, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { HUB_BASE } from '../services/apiBase';

export function useChat(quotationId) {
  const [connection, setConnection] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    if (!quotationId) return;

    const accessToken = localStorage.getItem('accessToken');
    
    // Khởi tạo connection
    const newConnection = new signalR.HubConnectionBuilder()
      // Chú ý URL hub phải đúng với backend (thường là /hubs/chat, nhưng do vite proxy, có thể để thẳng URL API hoặc dùng proxy)
      .withUrl(`${HUB_BASE}/chat`, {
        accessTokenFactory: () => accessToken
      })
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    newConnection.start()
      .then(() => {
        console.log('Connected to SignalR ChatHub');
        // Join the specific quotation room — có .catch() vì server có thể từ chối (báo giá không
        // tồn tại, không phải khách/Sales phụ trách...); nếu không bắt, lỗi rơi thành unhandled
        // promise rejection ("Uncaught (in promise)") thay vì hiển thị rõ nguyên nhân.
        newConnection.invoke('JoinQuotationChat', quotationId).catch(e => {
          console.error('Không thể tham gia phòng chat báo giá:', e);
        });
        setIsConnecting(false);
      })
      .catch(e => {
        console.error('SignalR Connection Error: ', e);
        setIsConnecting(false);
      });

    // Lắng nghe tin nhắn mới
    newConnection.on('ReceiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      if (newConnection) {
        newConnection.invoke('LeaveQuotationChat', quotationId).catch(console.error);
        newConnection.stop();
      }
    };
  }, [quotationId]);

  // Gửi tin nhắn mới
  const sendMessage = useCallback(async (content) => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) {
      try {
        await connection.invoke('SendMessage', quotationId, content);
      } catch (e) {
        console.error('Lỗi khi gửi tin nhắn:', e);
      }
    } else {
      console.warn('No connection to server yet.');
    }
  }, [connection, quotationId]);

  return {
    messages,
    setMessages, // dùng để khởi tạo message ban đầu tải từ REST API
    sendMessage,
    isConnecting
  };
}
