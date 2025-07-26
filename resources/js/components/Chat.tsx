import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react'; // Keep for router.reload

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatProps {
  session: {
    id: number;
    subject: string | null;
  } | null;
  messages: ChatMessage[];
  basePlan?: any;
}

export default function Chat({ session, messages, basePlan }: ChatProps) {
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, answer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() || isLoading) return;

    const currentPrompt = prompt.trim();
    setPrompt('');
    setQuestion(currentPrompt);
    setAnswer('');
    setIsLoading(true);

    try {
      // Start the streaming request
      const response = await fetch('/chat/stream/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          prompt: currentPrompt,
          session_id: session?.id,
          base_plan_id: basePlan?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start chat stream');
      }

      const data = await response.json();
      
      if (data.stream_url) {
        // Start listening to the stream endpoint
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
            // Refresh the page to get updated messages
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
    // Cleanup event source on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {session?.subject || 'New Chat'}
        </h2>
      </div>

      {/* Messages */}
      <div 
        ref={messagesRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div 
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            </div>
          </div>
        ))}

        {/* Current question/answer pair */}
        {question && (
          <div className="flex justify-end">
            <div className="max-w-3xl px-4 py-2 rounded-lg bg-blue-600 text-white">
              {question}
            </div>
          </div>
        )}

        {(answer || isLoading) && (
          <div className="flex justify-start">
            <div className="max-w-3xl px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
              {answer ? (
                <div dangerouslySetInnerHTML={{ __html: answer }} />
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask me anything about your training..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            disabled={isLoading}
            minLength={3}
            maxLength={1000}
            required
          />
          <button
            type="submit"
            disabled={isLoading || !prompt.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              'Send'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}