import ChatInput from '@/components/chat/chat-input';
import ChatMessageList from '@/components/chat/chat-message-list';
import chat from '@/routes/chat';
import { SharedData } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import ChatSidebarLayout from '@/layouts/app/chat-sidebar-layout';

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
    basePlan?: { id: number } | null;
    streamUrl: string;
}

type PrismTextChunk = {
    text: string;
    toolCalls: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
        resultId?: string;
        reasoningId?: string;
        reasoningSummary?: string;
    }>;
    toolResults: Array<{
        toolCallId: string;
        toolName: string;
        args: Record<string, any>;
        result: number | string | Record<string, any>;
        toolCallResultId?: string;
    }>;
    meta: {
        id: string;
        model: string;
        rateLimits: Array<{
            name: string;
            limit?: number;
            remaining?: number;
            resetsAt?: Date;
        }>;
    };
    chunkType: 'text' | 'thinking' | 'meta' | 'tool_call' | 'tool_result';
    usage: {
        promptTokens: number;
        completionTokens: number;
        cacheWriteInputTokens?: number;
        cacheReadInputTokens?: number;
        thoughtTokens?: number;
    };
};

export default function ChatPage({ session, messages, sessions = null }: ChatPageProps) {
    const $page = usePage<SharedData>();
    const [question, setQuestion] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [answer, setAnswer] = useState<string>('');
    const [isThinking, setIsThinking] = useState(false);
    const [currentToolCalls, setCurrentToolCalls] = useState<Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
        status: 'calling' | 'completed';
        result?: unknown;
    }>>([]);
    const submit = async (prompt: string) => {
        try {
            setIsLoading(true);

            const response = await fetch(chat.message.store.url(session), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': $page.props.csrf_token,
                },
                body: JSON.stringify({ message: prompt }),
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const { answerUrl } = await response.json();

            const source = new EventSource(answerUrl);

            source.addEventListener('update', (event: MessageEvent<string>) => {
                if (event.data === '</stream>') {
                    source.close();

                    return;
                }

                const chunk: PrismTextChunk = JSON.parse(event.data);

                switch (chunk.chunkType) {
                    case 'text':
                        setAnswer((prev) => prev + chunk.text);
                        setIsThinking(false);
                        break;
                    case 'thinking':
                        setIsThinking(true);
                        break;
                    case 'tool_call':
                        chunk.toolCalls.forEach(toolCall => {
                            setCurrentToolCalls(prev => {
                                const existing = prev.find(tc => tc.id === toolCall.id);
                                if (existing) return prev;
                                return [...prev, {
                                    id: toolCall.id,
                                    name: toolCall.name,
                                    arguments: toolCall.arguments,
                                    status: 'calling' as const
                                }];
                            });
                        });
                        break;
                    case 'tool_result':
                        chunk.toolResults.forEach(toolResult => {
                            setCurrentToolCalls(prev => 
                                prev.map(tc => 
                                    tc.id === toolResult.toolCallId 
                                        ? { ...tc, status: 'completed' as const, result: toolResult.result }
                                        : tc
                                )
                            );
                        });
                        break;
                    case 'meta':
                        // Handle meta information if needed
                        break;
                }
            });
        } catch (err) {
            console.error(err);

            if (err instanceof Error) {
                toast.error(err.message);
            }
        } finally {
            setIsLoading(false);
            setIsThinking(false);
            setCurrentToolCalls([]);
        }
    };

    const breadcrumbs = [
        { title: 'Chat', href: chat.index.url() },
        ...(session?.subject ? [{ title: session.subject, href: chat.show.url({ session: session.id }) }] : [])
    ];

    return (
        <ChatSidebarLayout 
            breadcrumbs={breadcrumbs}
            currentSession={session}
            sessions={sessions}
        >
            <Head title={session?.subject || 'Chat'} />
            
            <div className="flex h-full flex-col">
                {/* Chat Messages */}
                <div className="flex-1 overflow-hidden">
                    <ChatMessageList 
                        messages={messages} 
                        currentQuestion={question} 
                        currentAnswer={answer} 
                        isLoading={isLoading}
                        isThinking={isThinking}
                        currentToolCalls={currentToolCalls}
                    />
                </div>

                {/* Chat Input */}
                <div className="border-t border-sidebar-border p-6">
                    <ChatInput
                        onSubmit={(prompt) => {
                            setQuestion(prompt);
                            return submit(prompt);
                        }}
                        isLoading={isLoading}
                        placeholder="Ask me anything about your training..."
                    />
                </div>
            </div>
        </ChatSidebarLayout>
    );
}
