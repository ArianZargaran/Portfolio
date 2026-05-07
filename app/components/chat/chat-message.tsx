import classnames from "classnames";
import React from "react";

import { DoubleCheck } from "~/components/icons/double-check";
import { Isotype } from "~/components/icons/isotype/isotype";

export type ChatAuthor = "them" | "me";

interface ChatMessageProps {
  author: ChatAuthor;
  text: string;
  timestamp: string;
  showAvatar?: boolean;
  showTail?: boolean;
  isRead?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  author,
  text,
  timestamp,
  showAvatar = false,
  showTail = false,
  isRead = true,
}) => (
  <div
    className={classnames("chat-row", `chat-row-${author}`, {
      "chat-row-with-avatar": showAvatar,
    })}
  >
    {author === "them" ? (
      <span
        className={classnames("chat-avatar chat-avatar-bubble", {
          "is-hidden": !showAvatar,
        })}
        aria-hidden={!showAvatar}
      >
        {showAvatar ? <Isotype width={24} height="auto" /> : null}
      </span>
    ) : null}
    <div
      className={classnames("chat-bubble", `chat-bubble-${author}`, {
        "chat-bubble-tail": showTail,
      })}
    >
      <p className="chat-bubble-text">{text}</p>
      <span className="chat-bubble-meta">
        <time className="chat-bubble-time">{timestamp}</time>
        {author === "me" ? (
          <span
            className={classnames("chat-bubble-receipt", {
              "is-read": isRead,
            })}
            aria-label={isRead ? "Read" : "Sent"}
          >
            <DoubleCheck width={16} height="auto" />
          </span>
        ) : null}
      </span>
    </div>
  </div>
);
