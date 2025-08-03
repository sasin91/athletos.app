import ChatHeader from '@/components/chat/chat-header';
import ChatInput from '@/components/chat/chat-input';
import ChatMessageList from '@/components/chat/chat-message-list';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { Head } from '@inertiajs/react';
import { useEventStream } from '@laravel/stream-react';
import { useState } from 'react';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatSession {
  id: number;
  subject: string | null;
  updated_at: string;
  messages_count?: number;
}

interface ChatPageProps {
  session: ChatSession;
  messages: ChatMessage[];
  sessions?: ChatSession[] | null;
  basePlan?: { id: number } | null;
  streamUrl: string;
}

export default function ChatPage({ session, messages, sessions = null, streamUrl }: ChatPageProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { message: answer } = useEventStream(streamUrl, {
    onComplete: () => {
      setIsLoading(false);
    }
  });

  return (
    <>
      <Head title={session?.subject || 'Chat'} />
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex">
        <ChatSidebar currentSession={session} sessions={sessions} />

        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          <ChatHeader title={session?.subject || 'New Chat'} />

          <ChatMessageList
            messages={messages}
            currentQuestion={question}
            currentAnswer={answer}
            isLoading={isLoading}
          />

          <ChatInput
            onSubmit={(prompt) => {
              setQuestion(prompt);
              setIsLoading(true);
            }}
            isLoading={isLoading}
            placeholder="Ask me anything about your training..."
          />
        </div>
      </div>
    </>
  );
}