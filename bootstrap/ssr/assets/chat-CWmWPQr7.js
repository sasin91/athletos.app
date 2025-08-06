import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Brain, Loader2, CheckCircle, Wrench } from "lucide-react";
import { c as chat, A as AppLayout } from "./app-layout-CUuxNbvK.js";
import { usePage, Head } from "@inertiajs/react";
import { toast } from "sonner";
import "class-variance-authority";
import "./button-hAi0Fg-Q.js";
import "@radix-ui/react-slot";
import "clsx";
import "tailwind-merge";
import "@radix-ui/react-tooltip";
import "@radix-ui/react-avatar";
import "./dropdown-menu-BtKPamvc.js";
import "@radix-ui/react-dropdown-menu";
import "@radix-ui/react-navigation-menu";
import "@radix-ui/react-dialog";
import "./index-BAFHCEvX.js";
import "./index-ID1znBf5.js";
import "./index-CrXrSpq1.js";
import "./app-logo-icon-wMAVxvx3.js";
function ChatInput({
  onSubmit,
  isLoading,
  placeholder = "Ask me anything about your training..."
}) {
  const [prompt, setPrompt] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    const currentPrompt = prompt.trim();
    setPrompt("");
    onSubmit(currentPrompt);
  };
  return /* @__PURE__ */ jsx("div", { className: "flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "flex space-x-4", children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        type: "text",
        value: prompt,
        onChange: (e) => setPrompt(e.target.value),
        placeholder,
        className: "flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        disabled: isLoading,
        minLength: 3,
        maxLength: 1e3,
        required: true
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "submit",
        disabled: isLoading || !prompt.trim(),
        className: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed",
        children: isLoading ? /* @__PURE__ */ jsx("div", { className: "animate-spin rounded-full h-4 w-4 border-b-2 border-white" }) : "Send"
      }
    )
  ] }) });
}
function ChatMessage({
  role,
  content,
  isLoading = false,
  isThinking = false,
  toolCalls = []
}) {
  const isUser = role === "user";
  return /* @__PURE__ */ jsx("div", { className: `flex ${isUser ? "justify-end" : "justify-start"}`, children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: `max-w-3xl px-4 py-2 rounded-lg ${isUser ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"}`,
      children: [
        isThinking && /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 mb-3 text-gray-600 dark:text-gray-400", children: [
          /* @__PURE__ */ jsx(Brain, { className: "h-4 w-4 animate-pulse" }),
          /* @__PURE__ */ jsx("span", { className: "text-sm italic", children: "Thinking..." })
        ] }),
        toolCalls.length > 0 && /* @__PURE__ */ jsx("div", { className: "space-y-2 mb-3", children: toolCalls.map((toolCall) => /* @__PURE__ */ jsxs("div", { className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2", children: [
            toolCall.status === "calling" ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin text-blue-600" }) : /* @__PURE__ */ jsx(CheckCircle, { className: "h-4 w-4 text-green-600" }),
            /* @__PURE__ */ jsx(Wrench, { className: "h-4 w-4 text-blue-600" }),
            /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-blue-800 dark:text-blue-200", children: toolCall.name }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-blue-600 dark:text-blue-400", children: toolCall.status === "calling" ? "Running..." : "Completed" })
          ] }),
          toolCall.status === "completed" && toolCall.result && /* @__PURE__ */ jsxs("div", { className: "mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-2", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium mb-1", children: "Result:" }),
            /* @__PURE__ */ jsx("div", { className: "font-mono text-xs truncate", children: typeof toolCall.result === "string" ? toolCall.result : JSON.stringify(toolCall.result).slice(0, 100) + "..." })
          ] })
        ] }, toolCall.id)) }),
        isLoading && !isThinking && /* @__PURE__ */ jsxs("div", { className: "flex items-center space-x-2 mb-3", children: [
          /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin text-blue-600" }),
          /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Generating response..." })
        ] }),
        content && /* @__PURE__ */ jsx("div", { className: "prose prose-sm max-w-none dark:prose-invert", children: /* @__PURE__ */ jsx(
          ReactMarkdown,
          {
            components: {
              pre: ({ children }) => /* @__PURE__ */ jsx("pre", { className: "bg-gray-900 dark:bg-gray-700 text-gray-100 p-3 rounded-md overflow-x-auto", children }),
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? /* @__PURE__ */ jsx("code", { className: "bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm", children }) : /* @__PURE__ */ jsx("code", { className, children });
              }
            },
            children: content
          }
        ) })
      ]
    }
  ) });
}
function ChatMessageList({
  messages,
  currentQuestion,
  currentAnswer,
  isLoading = false,
  isThinking = false,
  currentToolCalls = []
}) {
  const messagesRef = useRef(null);
  const scrollToBottom = () => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentAnswer]);
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref: messagesRef,
      className: "h-full overflow-y-auto space-y-6",
      children: /* @__PURE__ */ jsxs("div", { className: "max-w-4xl mx-auto px-4 py-8 space-y-6", children: [
        messages.map((message) => /* @__PURE__ */ jsx(
          ChatMessage,
          {
            role: message.role,
            content: message.content
          },
          message.id
        )),
        currentQuestion && /* @__PURE__ */ jsx(
          ChatMessage,
          {
            role: "user",
            content: currentQuestion
          }
        ),
        (currentAnswer || isLoading || isThinking || currentToolCalls.length > 0) && /* @__PURE__ */ jsx(
          ChatMessage,
          {
            role: "assistant",
            content: currentAnswer || "",
            isLoading: !currentAnswer && isLoading && !isThinking,
            isThinking,
            toolCalls: currentToolCalls
          }
        )
      ] })
    }
  );
}
function ChatPage({ session, messages, sessions = null }) {
  const $page = usePage();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [currentToolCalls, setCurrentToolCalls] = useState([]);
  const submit = async (prompt) => {
    try {
      setIsLoading(true);
      const response = await fetch(chat.message.store.url(session), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": $page.props.csrf_token
        },
        body: JSON.stringify({ message: prompt }),
        credentials: "include"
      });
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      const { answerUrl } = await response.json();
      const source = new EventSource(answerUrl);
      source.addEventListener("update", (event) => {
        if (event.data === "</stream>") {
          source.close();
          return;
        }
        const chunk = JSON.parse(event.data);
        switch (chunk.chunkType) {
          case "text":
            setAnswer((prev) => prev + chunk.text);
            setIsThinking(false);
            break;
          case "thinking":
            setIsThinking(true);
            break;
          case "tool_call":
            chunk.toolCalls.forEach((toolCall) => {
              setCurrentToolCalls((prev) => {
                const existing = prev.find((tc) => tc.id === toolCall.id);
                if (existing) return prev;
                return [...prev, {
                  id: toolCall.id,
                  name: toolCall.name,
                  arguments: toolCall.arguments,
                  status: "calling"
                }];
              });
            });
            break;
          case "tool_result":
            chunk.toolResults.forEach((toolResult) => {
              setCurrentToolCalls(
                (prev) => prev.map(
                  (tc) => tc.id === toolResult.toolCallId ? { ...tc, status: "completed", result: toolResult.result } : tc
                )
              );
            });
            break;
          case "meta":
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
    { title: "Chat", href: chat.index.url() },
    ...(session == null ? void 0 : session.subject) ? [{ title: session.subject, href: chat.show.url({ session: session.id }) }] : []
  ];
  return /* @__PURE__ */ jsxs(AppLayout, { breadcrumbs, children: [
    /* @__PURE__ */ jsx(Head, { title: (session == null ? void 0 : session.subject) || "Chat" }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col h-screen bg-white dark:bg-gray-900", children: [
      /* @__PURE__ */ jsx("div", { className: "flex-1 min-h-0 overflow-hidden", children: /* @__PURE__ */ jsx(
        ChatMessageList,
        {
          messages,
          currentQuestion: question,
          currentAnswer: answer,
          isLoading,
          isThinking,
          currentToolCalls
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4", children: /* @__PURE__ */ jsx("div", { className: "max-w-4xl mx-auto", children: /* @__PURE__ */ jsx(
        ChatInput,
        {
          onSubmit: (prompt) => {
            setQuestion(prompt);
            return submit(prompt);
          },
          isLoading,
          placeholder: "Ask me anything about your training..."
        }
      ) }) })
    ] })
  ] });
}
export {
  ChatPage as default
};
