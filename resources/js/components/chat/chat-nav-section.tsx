import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import chat from '@/routes/chat';
import { router } from '@inertiajs/react';
import { MessageCircle, Plus, Trash2 } from 'lucide-react';

interface ChatSession {
    id: number;
    subject: string | null;
    updated_at: string;
    messages_count?: number;
}

interface ChatNavSectionProps {
    currentSession?: ChatSession | null;
    sessions?: ChatSession[] | null;
}

export function ChatNavSection({ currentSession = null, sessions = null }: ChatNavSectionProps) {
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
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Chat Sessions</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {/* New Chat Button */}
                    <SidebarMenuItem>
                        <SidebarMenuButton 
                            onClick={() => router.visit(chat.new.url())}
                            className="w-full justify-start"
                        >
                            <Plus className="h-4 w-4" />
                            <span>New Chat</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Chat Sessions */}
                    {sessions && sessions.length > 0 ? (
                        sessions.map((session) => (
                            <SidebarMenuItem key={session.id}>
                                <div className="group relative flex items-center">
                                    <SidebarMenuButton
                                        isActive={currentSession?.id === session.id}
                                        onClick={() => router.visit(chat.show.url({ session: session.id }))}
                                        className="w-full justify-start pr-8"
                                        tooltip={{
                                            children: session.subject || 'Untitled Chat',
                                            side: 'right'
                                        }}
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        <div className="flex-1 min-w-0">
                                            <div className="truncate text-sm">
                                                {session.subject || 'Untitled Chat'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatDate(session.updated_at)}
                                            </div>
                                        </div>
                                    </SidebarMenuButton>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('Are you sure you want to delete this chat?')) {
                                                router.delete(chat.show.url({ session: session.id }));
                                            }
                                        }}
                                        className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all z-10"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </SidebarMenuItem>
                        ))
                    ) : (
                        <SidebarMenuItem>
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                                No chat history yet
                            </div>
                        </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}