import React from "react";

import { Isotype } from "~/components/icons/isotype/isotype";

interface ChatHeaderProps {
  name: string;
  status: string;
  title?: string;
  isOnline?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  name,
  status,
  title,
  isOnline = true,
}) => (
  <header className="chat-header">
    <div className="chat-header-identity">
      <span className="chat-avatar">
        <Isotype width={24} height="auto" />
      </span>
      <div className="chat-header-meta">
        <p className="chat-header-name">{name}</p>
        <p className="chat-header-status">
          {isOnline ? <span className="chat-header-presence" /> : null}
          {status}
        </p>
      </div>
    </div>
    <div className="chat-header-actions">
      {title ? <h1 className="chat-header-title">{title}</h1> : null}
      <button
        type="button"
        className="chat-header-action chat-header-menu"
        aria-label="More options"
      >
        <span />
        <span />
        <span />
      </button>
    </div>
  </header>
);
