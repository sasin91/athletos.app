import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { route } from '@/lib/wayfinder';

interface UseChatStreamProps {
  sessionId?: number;
  basePlanId?: number;
}

export function useChatStream({ sessionId, basePlanId }: UseChatStreamProps) {
  const [answer, setAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const startChat = async (prompt: string) => {
    setQuestion(prompt);
    setAnswer('');
    setIsLoading(true);

    try {
      // Use wayfinder for route URL with standard Laravel CSRF token
      const response = await fetch(route['chat.stream.start']().url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          prompt: prompt,
          session_id: sessionId,
          base_plan_id: basePlanId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start chat stream');
      }

      const data = await response.json();

      if (data.stream_url) {
        eventSourceRef.current = new EventSource(data.stream_url);

        eventSourceRef.current.onmessage = (event) => {
          const chunk = JSON.parse(event.data);

          if (chunk.type === 'text') {
            setAnswer(prev => prev + chunk.content);
          } else if (chunk.type === 'thinking') {
            setAnswer(prev => prev + '*Thinking...*\n\n');
          } else if (chunk.type === 'tool_call') {
            setAnswer(prev => prev + `*Calling: ${chunk.tool_name}...*\n\n`);
          } else if (chunk.type === 'tool_result') {
            setAnswer(prev => prev + `*✅ ${chunk.tool_name} called*\n\n`);
          } else if (chunk.type === 'finished') {
            eventSourceRef.current?.close();
            setIsLoading(false);
            // Reload to get updated messages and sessions from database
            router.reload({ only: ['messages', 'session', 'sessions'] });
          }
        };

        eventSourceRef.current.onerror = (error) => {
          console.error('EventSource failed:', error);
          eventSourceRef.current?.close();
          setIsLoading(false);
          setAnswer(prev => prev + '*Connection Error: Stream interrupted*');
        };
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
      setAnswer('*Connection Error: ' + (error as Error).message + '*');
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    answer,
    question,
    isLoading,
    startChat,
  };
}