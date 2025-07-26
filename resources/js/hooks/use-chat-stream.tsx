import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { routes, route } from '@/lib/wayfinder';

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
      // Use wayfinder for route URL, but fetch for streaming API
      const response = await fetch(route['chat.stream.start']().url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
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
            setAnswer(prev => prev + '<i>Thinking...</i><br>');
          } else if (chunk.type === 'tool_call') {
            setAnswer(prev => prev + `<i>Calling: ${chunk.tool_name}...</i><br>`);
          } else if (chunk.type === 'tool_result') {
            setAnswer(prev => prev + `<i>✅ ${chunk.tool_name} called</i><br>`);
          } else if (chunk.type === 'finished') {
            eventSourceRef.current?.close();
            setIsLoading(false);
            // Use Inertia router for page reload
            router.reload({ only: ['messages'] });
          }
        };

        eventSourceRef.current.onerror = (error) => {
          console.error('EventSource failed:', error);
          eventSourceRef.current?.close();
          setIsLoading(false);
          setAnswer(prev => prev + '<i>Connection Error: Stream interrupted</i>');
        };
      }
    } catch (error) {
      console.error('Chat error:', error);
      setIsLoading(false);
      setAnswer('<i>Connection Error: ' + (error as Error).message + '</i>');
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