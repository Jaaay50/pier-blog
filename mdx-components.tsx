import type { MDXComponents } from "mdx/types";
import Image from "next/image";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="mb-6 mt-12 text-4xl font-bold tracking-tight">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-4 mt-10 text-2xl font-bold tracking-tight">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-3 mt-8 text-xl font-semibold">{children}</h3>
    ),
    p: ({ children }) => (
      <p className="mb-4 leading-relaxed text-[var(--text-secondary)]">
        {children}
      </p>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors underline underline-offset-2"
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="mb-4 ml-6 list-disc space-y-2 text-[var(--text-secondary)]">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-4 ml-6 list-decimal space-y-2 text-[var(--text-secondary)]">
        {children}
      </ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="mb-4 border-l-2 border-[var(--accent)] pl-4 italic text-[var(--text-muted)]">
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="rounded bg-[var(--bg-card)] px-1.5 py-0.5 text-sm font-mono text-[var(--accent-hover)]">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="mb-6 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-card)] p-4 text-sm">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="border-b border-[var(--border)] px-4 py-2 text-left font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border-b border-[var(--border)] px-4 py-2 text-[var(--text-secondary)]">
        {children}
      </td>
    ),
    hr: () => <hr className="my-8 border-[var(--border)]" />,
    img: ({ src, alt }) => (
      <Image
        src={src || ""}
        alt={alt || ""}
        width={800}
        height={450}
        className="mb-6 rounded-lg border border-[var(--border)]"
        style={{ width: '100%', height: 'auto' }}
      />
    ),
    ...components,
  };
}
