import { useState } from 'react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { Calendar, Dumbbell, TrendingUp, Search } from 'lucide-react';

interface Command {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  shortcut?: string;
  favorite?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface UseDashboardCommandsProps {
  onStartTraining: () => void;
}

export function useDashboardCommands({ onStartTraining }: UseDashboardCommandsProps) {
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  const commands: Command[] = [
    {
      id: 'start-training',
      label: 'Start Training',
      description: 'Begin today\'s workout session',
      icon: <Dumbbell className="w-4 h-4" />,
      category: 'Training',
      action: onStartTraining,
      shortcut: '⌘ T'
    },
    {
      id: 'view-progress',
      label: 'View Progress',
      description: 'See your fitness progress over time',
      icon: <TrendingUp className="w-4 h-4" />,
      category: 'Analytics',
      action: () => routes.progress(),
      shortcut: '⌘ P'
    },
    {
      id: 'chat-ai',
      label: 'Chat with AI Coach',
      description: 'Get personalized training advice',
      icon: <Search className="w-4 h-4" />,
      category: 'AI',
      action: () => routes.chat(),
      shortcut: '⌘ /',
      favorite: true
    },
    {
      id: 'view-calendar',
      label: 'Training Calendar',
      description: 'View your training schedule',
      icon: <Calendar className="w-4 h-4" />,
      category: 'Planning',
      action: () => routes.calendar()
    }
  ];

  const quickActions: QuickAction[] = [
    {
      id: 'quick-start',
      label: 'Start Training',
      icon: <Dumbbell className="w-4 h-4" />,
      onClick: onStartTraining
    },
    {
      id: 'quick-chat',
      label: 'Ask AI Coach',
      icon: <Search className="w-4 h-4" />,
      onClick: () => routes.chat()
    },
    {
      id: 'quick-progress',
      label: 'View Progress',
      icon: <TrendingUp className="w-4 h-4" />,
      onClick: () => routes.progress()
    }
  ];

  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'k',
        metaKey: true,
        action: () => setShowCommandPalette(true),
        description: 'Open command palette'
      },
      {
        key: 't',
        metaKey: true,
        action: onStartTraining,
        description: 'Start training'
      },
      {
        key: '/',
        metaKey: true,
        action: () => routes.chat(),
        description: 'Open AI chat'
      }
    ]
  });

  return {
    showCommandPalette,
    setShowCommandPalette,
    commands,
    quickActions
  };
}