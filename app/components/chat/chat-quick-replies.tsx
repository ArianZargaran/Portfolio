import React from "react";

interface ChatQuickRepliesProps {
  options: ReadonlyArray<string>;
  onSelect?: (option: string) => void;
}

export const ChatQuickReplies: React.FC<ChatQuickRepliesProps> = ({
  options,
  onSelect,
}) => (
  <div className="chat-quick-replies" role="group" aria-label="Suggested replies">
    {options.map((option) => (
      <button
        key={option}
        type="button"
        className="chat-quick-reply"
        onClick={onSelect ? () => onSelect(option) : undefined}
      >
        {option}
      </button>
    ))}
  </div>
);
