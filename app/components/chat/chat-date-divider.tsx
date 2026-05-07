import React from "react";

interface ChatDateDividerProps {
  label: string;
}

export const ChatDateDivider: React.FC<ChatDateDividerProps> = ({ label }) => (
  <div className="chat-date-divider" role="separator" aria-label={label}>
    <span className="chat-date-pill">{label}</span>
  </div>
);
