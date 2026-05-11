import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import type { ComponentPropsWithoutRef } from "react";

function isInternalHref(href: string | undefined): href is string {
  if (!href) return false;
  return href.startsWith("/") && !href.startsWith("//");
}

function MarkdownLink({
  href,
  children,
  ...rest
}: ComponentPropsWithoutRef<"a">) {
  if (isInternalHref(href)) {
    return (
      <Link to={href} className="text-accent underline-offset-4 hover:underline">
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent underline-offset-4 hover:underline"
      {...rest}
    >
      {children}
    </a>
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{ a: MarkdownLink }}
    >
      {children}
    </ReactMarkdown>
  );
}
