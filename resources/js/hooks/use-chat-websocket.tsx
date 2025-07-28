import { useState, useCallback, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import echo from '@/lib/echo';

interface UseChatWebSocketProps {
  sessionId?: number;
  basePlanId?: number;
}

interface ChatChunk {
  type: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'meta' | 'finished' | 'error';
  content?: string;
  tool_name?: string;
  model?: string;
  id?: string;
  message?: string;
  reason?: string;
}

export function useChatWebSocket({ sessionId, basePlanId }: UseChatWebSocketProps) {
  const [answer, setAnswer] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<any>(null);
  const currentSessionRef = useRef<number | undefined>(sessionId);

  // Update session reference when sessionId changes
  useEffect(() => {
    currentSessionRef.current = sessionId;
  }, [sessionId]);

  // Clean up channel on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        echo.leaveChannel(channelRef.current.name);
        channelRef.current = null;
      }
    };
  }, []);

  const startChat = useCallback(async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    setQuestion(prompt);
    setAnswer('');
    setError(null);
    setIsLoading(true);

    try {
      // Create WebSocket connection for this chat session
      const channelName = `chat.${sessionId || 'new'}`;
      
      if (channelRef.current) {
        echo.leaveChannel(channelRef.current.name);
      }

      channelRef.current = echo.private(channelName);

      // Listen for chat response chunks
      channelRef.current.listen('ChatResponseChunk', (event: ChatChunk) => {
        switch (event.type) {
          case 'text':
            if (event.content) {
              setAnswer(prev => prev + event.content);
            }
            break;
          
          case 'thinking':
            // Could show thinking indicator
            break;
          
          case 'tool_call':
            // Could show tool call indicator
            break;
          
          case 'tool_result':
            // Could show tool result indicator
            break;
          
          case 'meta':
            // Handle metadata if needed
            break;
          
          case 'finished':
            setIsLoading(false);
            // Reload page to update sidebar with new session/messages
            router.reload({ only: ['sessions', 'messages', 'session'] });
            break;
          
          case 'error':
            setError(event.message || 'An error occurred');
            setIsLoading(false);
            break;
        }
      });

      // Send the chat message via API
      const response = await fetch('/api/chat/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          prompt,
          session_id: sessionId,
          base_plan_id: basePlanId,
          channel: channelName,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update session ID if we created a new session
      if (data.session_id && !sessionId) {
        currentSessionRef.current = data.session_id;
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      setIsLoading(false);
      
      // Clean up channel on error
      if (channelRef.current) {
        echo.leaveChannel(channelRef.current.name);
        channelRef.current = null;
      }
    }
  }, [sessionId, basePlanId, isLoading]);

  return {
    answer,
    question,
    isLoading,
    error,
    startChat,
  };
}