import { Head } from '@inertiajs/react';
import Chat from '@/Components/Chat';

interface ChatPageProps {
  session: {
    id: number;
    subject: string | null;
  } | null;
  messages: Array<{
    id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
  }>;
  basePlan?: any;
}

export default function ChatPage({ session, messages, basePlan }: ChatPageProps) {
  return (
    <>
      <Head title={session?.subject || 'Chat'} />
      <div className="h-screen bg-gray-50 dark:bg-gray-900">
        <Chat session={session} messages={messages} basePlan={basePlan} />
      </div>
    </>
  );
}