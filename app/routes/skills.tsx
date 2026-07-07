import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";

import { ChatDateDivider } from "~/components/chat/chat-date-divider";
import { ChatHeader } from "~/components/chat/chat-header";
import { ChatInput } from "~/components/chat/chat-input";
import { ChatMessage, ChatAuthor } from "~/components/chat/chat-message";
import { ChatQuickReplies } from "~/components/chat/chat-quick-replies";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import skills from "~/stylesheets/skills.css";
import { getSkillReply, QUICK_REPLY_QUESTIONS } from "~/utils/skills-chat";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  { rel: "stylesheet", href: commonThemePage },
  { rel: "stylesheet", href: skills },
];

const QUICK_REPLIES = [
  "Languages",
  "Frameworks",
  "Design",
  "Tools",
] as const;

/** How long the typing indicator holds before the reply lands, ms. */
const REPLY_DELAY = 900;

interface ChatEntry {
  id: number;
  author: ChatAuthor;
  text: string;
  timestamp: string;
  showAvatar?: boolean;
  showTail?: boolean;
  isRead?: boolean;
}

const SEED_CONVERSATION: ChatEntry[] = [
  {
    id: 1,
    author: "them",
    text: "Hey! I'm Ari.",
    timestamp: "09:41",
    showAvatar: false,
    showTail: false,
  },
  {
    id: 2,
    author: "them",
    text: "Ask me anything about my skills — languages, frameworks, design, tools, the works.",
    timestamp: "09:41",
    showAvatar: true,
    showTail: true,
  },
];

const formatNow = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const SkillsPage = () => {
  const [messages, setMessages] = useState<ChatEntry[]>(SEED_CONVERSATION);
  const [value, setValue] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const nextId = useRef(SEED_CONVERSATION.length + 1);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);

  const appendReply = useCallback((text: string) => {
    const replyId = nextId.current++;
    setMessages((prev) => [
      ...prev,
      {
        id: replyId,
        author: "them",
        text,
        timestamp: formatNow(),
        showAvatar: true,
        showTail: true,
      },
    ]);
    setIsTyping(false);
  }, []);

  const sendMessage = useCallback(
    (text: string) => {
      const askId = nextId.current++;
      setMessages((prev) => [
        ...prev,
        {
          id: askId,
          author: "me",
          text,
          timestamp: formatNow(),
          showTail: true,
          isRead: true,
        },
      ]);
      setValue("");
      setIsTyping(true);

      // Raced against the real request (not run after it) so the typing
      // indicator holds for a believable minimum even when the reply comes
      // back instantly (e.g. the server-side static fallback) — but doesn't
      // artificially cap it short when a real generated reply takes longer.
      const minDelay = new Promise<void>((resolve) => {
        window.setTimeout(resolve, REPLY_DELAY);
      });
      const fetchReply = fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      })
        .then((res) => res.json())
        .then((data: { reply?: unknown }) =>
          typeof data.reply === "string" ? data.reply : getSkillReply(text),
        )
        .catch(() => getSkillReply(text));

      Promise.all([fetchReply, minDelay]).then(([reply]) =>
        appendReply(reply),
      );
    },
    [appendReply],
  );

  const handleQuickReply = useCallback(
    (option: string) => {
      sendMessage(QUICK_REPLY_QUESTIONS[option] ?? option);
    },
    [sendMessage],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isTyping]);

  return (
    <section className="page skills skills-page">
      <div className="chat-shell">
        <ChatHeader name="Ari" status="online" title="Skills" />
        <div className="chat-canvas">
          <div className="chat-thread">
            <ChatDateDivider label="Today" />
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                author={message.author}
                text={message.text}
                timestamp={message.timestamp}
                showAvatar={message.showAvatar}
                showTail={message.showTail}
                isRead={message.isRead}
              />
            ))}
            {isTyping ? (
              <div
                className="chat-row chat-row-them chat-typing"
                aria-label="Ari is typing"
              >
                <span
                  className="chat-avatar chat-avatar-bubble is-hidden"
                  aria-hidden
                />
                <span className="chat-typing-bubble">
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </span>
              </div>
            ) : null}
            <div ref={bottomRef} />
          </div>
        </div>
        <div className="chat-composer">
          <ChatQuickReplies
            options={QUICK_REPLIES}
            onSelect={handleQuickReply}
          />
          <ChatInput
            value={value}
            onChange={handleChange}
            onSubmit={sendMessage}
          />
        </div>
      </div>
    </section>
  );
};

export default SkillsPage;
