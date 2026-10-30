import './MenuNotes.css';

type Block =
  | { kind: 'header'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; lines: string[] };

// `# ` starts a header, `- ` a bullet, a blank line ends a paragraph. Anything else is
// plain text, so a note typed without any of these still reads as written.
function parseNotes(notes: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of notes.split('\n')) {
    const line = raw.trim();
    const last = blocks[blocks.length - 1];
    if (!line) {
      blocks.push({ kind: 'paragraph', lines: [] });
    } else if (line.startsWith('#')) {
      const text = line.replace(/^#+/, '').trim();
      if (text) blocks.push({ kind: 'header', text });
    } else if (line.startsWith('- ')) {
      const text = line.slice(2).trim();
      if (last?.kind === 'list') last.items.push(text);
      else blocks.push({ kind: 'list', items: [text] });
    } else if (last?.kind === 'paragraph') {
      last.lines.push(line);
    } else {
      blocks.push({ kind: 'paragraph', lines: [line] });
    }
  }
  return blocks.filter(b => b.kind !== 'paragraph' || b.lines.length > 0);
}

export default function MenuNotes({ notes }: { notes: string }) {
  const blocks = parseNotes(notes);
  if (blocks.length === 0) return null;

  return (
    <section className="menu-notes" aria-label="More from the bar">
      {blocks.map((block, i) => {
        if (block.kind === 'header') return <h2 key={i} className="menu-notes-header">{block.text}</h2>;
        if (block.kind === 'list') {
          return (
            <ul key={i} className="menu-notes-list">
              {block.items.map((item, j) => <li key={j}>{item}</li>)}
            </ul>
          );
        }
        return (
          <p key={i} className="menu-notes-paragraph">
            {block.lines.map((line, j) => (
              <span key={j}>{j > 0 && <br />}{line}</span>
            ))}
          </p>
        );
      })}
    </section>
  );
}
