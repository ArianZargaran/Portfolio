import classnames from "classnames";
import React, { ChangeEvent, FormEvent } from "react";

import { Send } from "~/components/icons/send";

interface ChatInputProps {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask me about my skills",
}) => {
  const trimmed = value.trim();
  const canSubmit = trimmed.length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit && onSubmit) {
      onSubmit(trimmed);
    }
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <label className="chat-input-field">
        <span className="chat-input-label-text">Message</span>
        <input
          type="text"
          className="chat-input-control"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete="off"
        />
      </label>
      <button
        type="submit"
        className={classnames("chat-input-send", {
          "is-active": canSubmit,
        })}
        aria-label="Send message"
        disabled={!canSubmit}
      >
        <Send width={24} height="auto" />
      </button>
    </form>
  );
};
