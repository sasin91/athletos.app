import { useRef, useEffect } from 'react';
import ChatMessage from './chat-message';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentQuestion?: string;
  currentAnswer?: string;
  isLoading?: boolean;
  isThinking?: boolean;
  currentToolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    status: 'calling' | 'completed';
    result?: unknown;
  }>;
}

export default function ChatMessageList({ 
  messages, 
  currentQuestion, 
  currentAnswer, 
  isLoading = false,
  isThinking = false,
  currentToolCalls = []
}: ChatMessageListProps) {
  const messagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAnswer]);

  return (
    <div 
      ref={messagesRef}
      className="flex-1 overflow-y-auto px-6 py-4 space-y-4"
    >
      {messages.map((message) => (
        <ChatMessage
          key={message.id}
          role={message.role}
          content={message.content}
        />
      ))}

      {/* Current question/answer pair */}
      {currentQuestion && (
        <ChatMessage
          role="user"
          content={currentQuestion}
        />
      )}

      {(currentAnswer || isLoading || isThinking || currentToolCalls.length > 0) && (
        <ChatMessage
          role="assistant"
          content={currentAnswer || ''}
          isLoading={!currentAnswer && isLoading && !isThinking}
          isThinking={isThinking}
          toolCalls={currentToolCalls}
        />
      )}
    </div>
  );
}