import type { ContentBlock } from "@/generated/contracts/content";

export function MessageBlocks({ blocks }: { blocks: ContentBlock[] }) {
  const visible = blocks.filter((block) => block.type !== "usage");
  if (visible.length === 0) return <p className="text-muted-foreground">No readable content was stored for this message.</p>;
  return (
    <div className="space-y-3">
      {visible.map((block, index) => <Block key={`${block.type}-${index}`} block={block} />)}
    </div>
  );
}

function Block({ block }: { block: ContentBlock }) {
  if (block.type === "text") return <p className="whitespace-pre-wrap break-words">{linkText(block.text)}</p>;
  if (block.type === "thinking" || block.type === "reasoning") {
    return (
      <details className="rounded-md border border-border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">Reasoning</summary>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">{block.text}</p>
      </details>
    );
  }
  if (block.type === "tool_use") return <p>Used tool {block.call.name}.</p>;
  if (block.type === "tool_result") {
    if (block.result.status === "completed") return <p>Tool finished.</p>;
    return <p className="whitespace-pre-wrap break-words">Tool {block.result.status}: {block.result.error.message}</p>;
  }
  if (block.type === "citation") {
    return (
      <p>
        <a className="break-words underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" href={block.url} rel="noopener noreferrer" target="_blank">
          {block.title ?? block.url}
        </a>
      </p>
    );
  }
  return null;
}

function linkText(text: string) {
  return text.split(/(https:\/\/[^\s]+)/g).map((part, index) => /^https:\/\//.test(part)
    ? <a key={index} className="underline underline-offset-2" href={part} rel="noopener noreferrer" target="_blank">{part}</a>
    : part,
  );
}
