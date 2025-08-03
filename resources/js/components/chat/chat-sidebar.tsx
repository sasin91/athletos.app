import { useState } from 'react';
import { router } from '@inertiajs/react';
import chat from '@/routes/chat';
import { PlusIcon, ChatBubbleLeftIcon, TrashIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface ChatSession {
  id: number;
  subject: string | null;
  updated_at: string;
  messages_count?: number;
}

interface ChatSidebarProps {
  currentSession?: ChatSession | null;
  sessions?: ChatSession[] | null;
}

export default function ChatSidebar({ currentSession = null, sessions = null }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
      >
        {isOpen ? (
          <XMarkIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <Bars3Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out
        flex flex-col h-full
      `}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              router.visit(chat.new.url());
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Chat
          </button>
        </div>

        {/* Chat sessions list */}
        <div className="flex-1 overflow-y-auto p-4">
          {!sessions || sessions.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
              <ChatBubbleLeftIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No chat history yet</p>
              <p className="text-sm">Start a conversation to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {(sessions || []).map((session) => (
                <div
                  key={session.id}
                  className={`
                    group relative p-3 rounded-lg cursor-pointer transition-colors
                    ${currentSession?.id === session.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                  onClick={() => {
                    router.visit(chat.show.url({ session: session.id }));
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {session.subject || 'Untitled Chat'}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatDate(session.updated_at)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {session.messages_count || 0} messages
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Are you sure you want to delete this chat?')) {
                          // TODO: Implement delete session API call
                          router.delete(chat.show.url({ session: session.id }));
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}