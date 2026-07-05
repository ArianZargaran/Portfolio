import type { ReactNode } from "react";

/**
 * Renders a small inline subset of Markdown as React elements: **bold**,
 * *italic*, `code`, and [links](https://…). No nesting, no block syntax —
 * enough for emphasis inside short copy (e.g. timeline card descriptions)
 * without pulling in a full Markdown dependency. Output is built as React
 * nodes, never injected as HTML.
 */
const TOKEN_PATTERN =
  /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

const LINK_PATTERN = /^\[([^\]]+)\]\(([^)\s]+)\)$/;

export const renderInlineMarkdown = (text: string): ReactNode[] => {
  return text.split(TOKEN_PATTERN).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    const link = part.match(LINK_PATTERN);
    if (link) {
      const [, label, href] = link;
      return (
        <a key={index} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      );
    }
    return part;
  });
};
