import { cn } from "@/lib/utils";

interface CodeBlockProps {
  html: string;
  lang?: string;
  className?: string;
}

/**
 * Renders Shiki output produced on the server (route loader / prerender).
 * Inline token styles are baked in at SSR time — no client highlighter bundle.
 */
export function CodeBlock({ html, lang = "ts", className }: CodeBlockProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden border border-border bg-[#1a1b26] text-[#c0caf5]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-black/20 px-3 py-1.5">
        <span className="text-xs text-[#565f89] select-none">{lang}</span>
      </div>
      <div
        className="shiki-code overflow-x-auto p-4 text-xs leading-relaxed [&_pre]:m-0 [&_pre]:bg-transparent [&_pre]:p-0 [&_pre]:font-mono [&_pre]:text-xs [&_pre]:leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
