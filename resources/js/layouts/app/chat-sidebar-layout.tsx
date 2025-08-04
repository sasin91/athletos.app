import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import { ChatAppSidebar } from '@/components/chat/chat-app-sidebar';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

interface ChatSession {
    id: number;
    subject: string | null;
    updated_at: string;
    messages_count?: number;
}

interface ChatSidebarLayoutProps {
    breadcrumbs?: BreadcrumbItem[];
    currentSession?: ChatSession | null;
    sessions?: ChatSession[] | null;
}

export default function ChatSidebarLayout({ 
    children, 
    breadcrumbs = [], 
    currentSession = null, 
    sessions = null 
}: PropsWithChildren<ChatSidebarLayoutProps>) {
    return (
        <AppShell variant="sidebar">
            <ChatAppSidebar currentSession={currentSession} sessions={sessions} />
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                {children}
            </AppContent>
        </AppShell>
    );
}