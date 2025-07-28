import { Head } from '@inertiajs/react';
import ChatHeader from '@/components/chat/chat-header';
import ChatMessageList from '@/components/chat/chat-message-list';
import ChatInput from '@/components/chat/chat-input';
import { useChatStream } from '@/hooks/use-chat-stream';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

interface ChatPageProps {
  session: {
    id: number;
    subject: string | null;
  } | null;
  messages: ChatMessage[];
  basePlan?: any;
}

export default function ChatPage({ session, messages, basePlan }: ChatPageProps) {
  const {
    answer,
    question,
    isLoading,
    startChat,
  } = useChatStream({ 
    sessionId: session?.id, 
    basePlanId: basePlan?.id 
  });

  return (
    <>
      <Head title={session?.subject || 'Chat'} />
      <div className="h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
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