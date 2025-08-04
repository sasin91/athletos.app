import ReactMarkdown from 'react-markdown';
import { Brain, Wrench, CheckCircle, Loader2 } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  isThinking?: boolean;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    status: 'calling' | 'completed';
    result?: unknown;
  }>;
}

export default function ChatMessage({ 
  role, 
  content, 
  isLoading = false, 
  isThinking = false,
  toolCalls = []
}: ChatMessageProps) {
  const isUser = role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-3xl px-4 py-2 rounded-lg ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
      >
        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex items-center space-x-2 mb-3 text-gray-600 dark:text-gray-400">
            <Brain className="h-4 w-4 animate-pulse" />
            <span className="text-sm italic">Thinking...</span>
          </div>
        )}

        {/* Tool calls */}
        {toolCalls.length > 0 && (
          <div className="space-y-2 mb-3">
            {toolCalls.map((toolCall) => (
              <div key={toolCall.id} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  {toolCall.status === 'calling' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <Wrench className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {toolCall.name}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {toolCall.status === 'calling' ? 'Running...' : 'Completed'}
                  </span>
                </div>
                {toolCall.status === 'completed' && toolCall.result && (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2">
                    <div className="font-medium mb-1">Result:</div>
                    <div className="font-mono text-xs truncate">
                      {typeof toolCall.result === 'string' 
                        ? toolCall.result 
                        : JSON.stringify(toolCall.result).slice(0, 100) + '...'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !isThinking && (
          <div className="flex items-center space-x-2 mb-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Generating response...</span>
          </div>
        )}

        {/* Main content */}
        {content && (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown 
              components={{
                pre: ({ children }) => (
                  <pre className="bg-gray-900 dark:bg-gray-700 text-gray-100 p-3 rounded-md overflow-x-auto">
                    {children}
                  </pre>
                ),
                code: ({ children, className }) => {
                  const isInline = !className;
                  return isInline ? (
                    <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}