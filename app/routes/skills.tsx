import { cssBundleHref } from "@remix-run/css-bundle";
import { LinksFunction } from "@remix-run/node";
import { ChangeEvent, useCallback, useState } from "react";

import { ChatDateDivider } from "~/components/chat/chat-date-divider";
import { ChatHeader } from "~/components/chat/chat-header";
import { ChatInput } from "~/components/chat/chat-input";
import { ChatMessage } from "~/components/chat/chat-message";
import { ChatQuickReplies } from "~/components/chat/chat-quick-replies";
import commonThemePage from "~/stylesheets/common-page-themes.css";
import skills from "~/stylesheets/skills.css";

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

const SEED_CONVERSATION = [
  {
    id: "intro-1",
    author: "them" as const,
    text: "Hey! I'm Ari.",
    timestamp: "09:41",
    showAvatar: false,
    showTail: false,
  },
  {
    id: "intro-2",
    author: "them" as const,
    text: "Ask me anything about my skills — languages, frameworks, design, tools, the works.",
    timestamp: "09:41",
    showAvatar: true,
    showTail: true,
  },
  {
    id: "ask-langs",
    author: "me" as const,
    text: "What languages do you know best?",
    timestamp: "09:42",
    showTail: true,
    isRead: true,
  },
  {
    id: "answer-langs",
    author: "them" as const,
    text: "TypeScript and JavaScript top the list. I've shipped Remix, Next.js, and Node services in production for years.",
    timestamp: "09:42",
    showAvatar: true,
    showTail: true,
  },
  {
    id: "ask-design",
    author: "me" as const,
    text: "And on the design side?",
    timestamp: "09:43",
    showTail: true,
    isRead: true,
  },
  {
    id: "answer-design",
    author: "them" as const,
    text: "Figma daily. Comfortable owning interaction, motion, and visual systems end-to-end.",
    timestamp: "09:43",
    showAvatar: true,
    showTail: true,
  },
];

const SkillsPage = () => {
  const [value, setValue] = useState<string>("");

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
  }, []);

  const handleQuickReply = useCallback((option: string) => {
    setValue(option);
  }, []);

  return (
    <section className="page skills skills-page">
      <div className="chat-shell">
        <ChatHeader name="Ari" status="online" title="Skills" />
        <div className="chat-canvas">
          <div className="chat-thread">
            <ChatDateDivider label="Today" />
            {SEED_CONVERSATION.map((message) => (
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
            <div className="chat-row chat-row-them chat-typing" aria-label="Ari is typing">
              <span className="chat-avatar chat-avatar-bubble is-hidden" aria-hidden />
              <span className="chat-typing-bubble">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </span>
            </div>
          </div>
        </div>
        <div className="chat-composer">
          <ChatQuickReplies
            options={QUICK_REPLIES}
            onSelect={handleQuickReply}
          />
          <ChatInput value={value} onChange={handleChange} />
        </div>
      </div>
    </section>
  );
};

export default SkillsPage;
