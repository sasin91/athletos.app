import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import ChatHeader from '@/components/chat/chat-header';
import ChatMessageList from '@/components/chat/chat-message-list';
import ChatInput from '@/components/chat/chat-input';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';

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
  session: ChatSession | null;
  messages: ChatMessage[];
  basePlan?: any;
  sessions?: ChatSession[] | null;
}

export default function ChatPage({ session, messages, basePlan, sessions = null }: ChatPageProps) {
  const {
    answer,
    question,
    isLoading,
    startChat,
  } = useChatWebSocket({ 
    sessionId: session?.id, 
    basePlanId: basePlan?.id 
  });

  // Auto-start with initial coach message for new users
  useEffect(() => {
    if (!session && messages.length === 0 && !question && !answer && !isLoading) {
      // Add a small delay to ensure the page is fully rendered
      setTimeout(() => {
        startChat("Hello, I'm your training coach. How can I be of assistance?");
      }, 100);
    }
  }, [session, messages.length, question, answer, isLoading, startChat]);

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
            onSubmit={startChat}
            isLoading={isLoading}
            placeholder="Ask me anything about your training..."
          />
        </div>
      </div>
    </>
  );
}