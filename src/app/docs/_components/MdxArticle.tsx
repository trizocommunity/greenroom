import Link from "next/link";
import type { ReactNode } from "react";

function inline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded bg-muted px-1.5 py-0.5 text-sm">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <Link key={index} href={link[2]} className="font-medium text-primary">
          {link[1]}
        </Link>
      );
    }
    return part;
  });
}

function renderTable(lines: string[], key: number) {
  const rows = lines
    .filter((line) => !/^\|\s*-/.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    );
  const [head, ...body] = rows;

  return (
    <div key={key} className="my-6 overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-muted">
          <tr>
            {head.map((cell) => (
              <th key={cell} className="px-4 py-3 font-semibold">
                {inline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-3 text-muted-foreground">
                  {inline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MdxArticle({ body }: { body: string }) {
  const blocks: ReactNode[] = [];
  const lines = body.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (!line.trim()) continue;

    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <pre
          key={blocks.length}
          className="my-5 overflow-x-auto rounded-lg bg-zinc-950 p-4 text-sm text-zinc-50"
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (line.startsWith("|")) {
      const table: string[] = [line];
      while (index + 1 < lines.length && lines[index + 1].startsWith("|")) {
        index += 1;
        table.push(lines[index]);
      }
      blocks.push(renderTable(table, blocks.length));
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={blocks.length} className="text-3xl font-bold tracking-tight">
          {inline(line.slice(2))}
        </h1>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={blocks.length}
          className="mt-8 border-t pt-6 text-xl font-semibold tracking-tight"
        >
          {inline(line.slice(3))}
        </h2>,
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items = [line.replace(/^\d+\.\s/, "")];
      while (index + 1 < lines.length && /^\d+\.\s/.test(lines[index + 1])) {
        index += 1;
        items.push(lines[index].replace(/^\d+\.\s/, ""));
      }
      blocks.push(
        <ol
          key={blocks.length}
          className="my-4 list-decimal space-y-2 pl-5 text-muted-foreground"
        >
          {items.map((item) => (
            <li key={item}>{inline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [line.slice(2)];
      while (index + 1 < lines.length && lines[index + 1].startsWith("- ")) {
        index += 1;
        items.push(lines[index].slice(2));
      }
      blocks.push(
        <ul
          key={blocks.length}
          className="my-4 list-disc space-y-2 pl-5 text-muted-foreground"
        >
          {items.map((item) => (
            <li key={item}>{inline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    blocks.push(
      <p key={blocks.length} className="leading-7 text-muted-foreground">
        {inline(line)}
      </p>,
    );
  }

  return <article className="space-y-4">{blocks}</article>;
}
