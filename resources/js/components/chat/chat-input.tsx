import { useState } from 'react';

interface ChatInputProps {
  onSubmit: (prompt: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export default function ChatInput({ 
  onSubmit, 
  isLoading, 
  placeholder = "Ask me anything about your training..." 
}: ChatInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() || isLoading) return;

    const currentPrompt = prompt.trim();
    setPrompt('');
    onSubmit(currentPrompt);
  };

  return (
    <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="flex space-x-4">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={placeholder}
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
  );
}