import ChatHeader from '@/components/chat/chat-header';
import ChatInput from '@/components/chat/chat-input';
import ChatMessageList from '@/components/chat/chat-message-list';
import ChatSidebar from '@/components/chat/chat-sidebar';
import { Head, router } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { useState } from 'react';
import { toast } from 'sonner';

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
}

export default function ChatPage({ session, messages, sessions = null }: ChatPageProps) {
  const [answer, setAnswer] = useState<string>('');
  const [question, setQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEcho<{ content: string }>(
    `chat.${session.id}`,
    'NewChatMessage',
    (event) => {
      setAnswer(prev => prev + event.content);
    }
  );


  const submitReply = async (reply: string) => {
    setIsLoading(true);
    router.post(`/chat/${session?.id}/reply`, {
      content: reply,
    }, {
      onSuccess: () => {
        // Clear the input after successful submission
        setQuestion('');
      },
      onError: (error) => {
        toast.error(error.message || 'An error occurred while sending your message.');
      },
      onFinish: () => {
        setIsLoading(false);
      }
    })
  }

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
            onSubmit={submitReply}
            isLoading={isLoading}
            placeholder="Ask me anything about your training..."
          />
        </div>
      </div>
    </>
  );
}