import { normalizeMarkdown, safeLink } from '../../config/markdownText';

// Text and React nodes only: HTML from AI or user content is never executed.
function inline(text, isUser, depth = 0, insideLink = false) {
  if (depth > 12) return text.replace(/\*\*|__|~~|`/g, '');
  const nodes = [];
  let position = 0;
  const token = /(`+)([^`]*?)\1|\[([^\]]+)\]\(([^\s]+?)\)|\*\*([^\n]+?)\*\*|__([^\n]+?)__|~~([^\n]+?)~~|\*([^*\n]+?)\*|(?<!\w)_([^_\n]+?)_(?!\w)|https?:\/\/[^\s<>)]+/g;
  const clean = value => value.replace(/\*\*|__|~~|`+/g, '').replace(/\\([*_~`\[\]#])/g, '$1');
  for (const match of text.matchAll(token)) {
    if (match.index > position) nodes.push(clean(text.slice(position, match.index)));
    const [whole, codeMarker, code, label, href, bold, underscoreBold, strike, italic, underscoreItalic] = match;
    const key = match.index;
    if (codeMarker) nodes.push(<code key={key} className="rounded bg-slate-100/80 px-1 font-mono text-xs text-slate-800">{code}</code>);
    else if (label !== undefined || whole.startsWith('http')) {
      const url = safeLink(href || whole.replace(/[.,;:!?]+$/, ''));
      const title = label ?? url ?? whole;
      nodes.push(url && !insideLink ? <a key={key} href={url} target={url.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={`underline break-words ${isUser ? 'text-white' : 'text-blue-700'}`}>{label === undefined ? title : inline(title, isUser, depth + 1, true)}</a> : <span key={key}>{clean(title)}</span>);
      if (!label && url && whole.length > url.length) nodes.push(whole.slice(url.length));
    } else if (bold !== undefined || underscoreBold !== undefined) nodes.push(<strong key={key} className="font-bold">{inline(bold ?? underscoreBold, isUser, depth + 1, insideLink)}</strong>);
    else if (strike !== undefined) nodes.push(<del key={key}>{inline(strike, isUser, depth + 1, insideLink)}</del>);
    else nodes.push(<em key={key}>{inline(italic ?? underscoreItalic, isUser, depth + 1, insideLink)}</em>);
    position = match.index + whole.length;
  }
  if (position < text.length) nodes.push(clean(text.slice(position)));
  return nodes;
}
const cells = line => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'));
const tableSeparator = line => /^\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());

export default function RichText({ content = '', isUser = false, compact = false, inheritColor = false, inline: inlineOnly = false }) {
  if (!content) return null;
  const lines = normalizeMarkdown(content, isUser).split('\n');
  if (inlineOnly) {
    const hasTable = lines.some(tableSeparator);
    const plainLines = lines.filter(line => !tableSeparator(line) && !/^\s*(?:```|~~~)/.test(line)).map(line =>
      hasTable && line.includes('|') ? cells(line).join(' · ') : line.replace(/^\s*#{1,6}\s+/, '').replace(/^\s*>\s?/, '').replace(/^\s*[-*+]\s+/, '• '));
    return <span className="whitespace-pre-wrap break-words">{inline(plainLines.join('\n'), isUser)}</span>;
  }
  const blocks = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]; const text = line.trim(); const key = index;
    if (!text) { blocks.push(<div key={key} className="h-1" />); continue; }
    if (/^\s*```|^\s*~~~/.test(line)) {
      const marker = text.slice(0, 3); const body = [];
      while (++index < lines.length && !lines[index].trim().startsWith(marker)) body.push(lines[index]);
      blocks.push(<pre key={key} className="max-w-full overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-800"><code>{body.join('\n')}</code></pre>); continue;
    }
    if (index + 1 < lines.length && line.includes('|') && tableSeparator(lines[index + 1])) {
      const headers = cells(line); const rows = []; index++;
      while (index + 1 < lines.length && lines[index + 1].includes('|') && lines[index + 1].trim()) rows.push(cells(lines[++index]));
      blocks.push(<div key={key} className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr>{headers.map((cell, i) => <th key={i} className="border border-slate-300 bg-slate-50 p-2 font-semibold">{inline(cell, isUser)}</th>)}</tr></thead><tbody>{rows.map((row, r) => <tr key={r}>{headers.map((_, c) => <td key={c} className="border border-slate-300 p-2">{inline(row[c] || '', isUser)}</td>)}</tr>)}</tbody></table></div>); continue;
    }
    const heading = text.match(/^#{1,6}\s+(.+)$/);
    if (heading) { blocks.push(<h3 key={key} className="mt-2 font-bold">{inline(heading[1], isUser)}</h3>); continue; }
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(text)) { blocks.push(<hr key={key} className="border-slate-200" />); continue; }
    const list = text.match(/^(?:(\d+)[.)]|[-*+])\s+(.+)$/);
    if (list) {
      const depth = Math.min(Math.floor((line.length - line.trimStart().length) / 2), 4);
      blocks.push(<div key={key} className="flex items-start gap-2 pl-2" style={depth ? { marginLeft: `${depth}rem` } : undefined}>
        <span className="shrink-0 tabular-nums">{list[1] ? `${list[1]}.` : '•'}</span><span className="min-w-0 flex-1">{inline(list[2], isUser)}</span></div>); continue;
    }
    if (/^>\s?/.test(text)) { blocks.push(<blockquote key={key} className="border-l-2 border-slate-400 bg-slate-100/60 px-3 py-1 text-inherit">{inline(text.replace(/^>\s?/, ''), isUser)}</blockquote>); continue; }
    blocks.push(<p key={key}>{inline(line, isUser)}</p>);
  }
  return <div className={`${compact ? 'space-y-1 text-xs' : 'space-y-1.5 text-sm'} leading-relaxed break-words font-sans ${inheritColor ? 'text-inherit' : isUser ? 'text-white' : 'text-slate-800'}`}>{blocks}</div>;
}
