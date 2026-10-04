import { cn } from '../../lib/ui';

export default function MarkdownRenderer({ content = '', isUser = false }) {
  if (!content) return null;
  const lines = String(content).split('\n');

  return (
    <div className={cn('space-y-2 break-words text-sm leading-7', isUser ? 'text-white' : 'text-slate-200')}>
      {lines.map((line, index) => {
        const value = line.trim();
        if (!value) return <div key={index} className="h-1" aria-hidden="true" />;
        if (value.startsWith('### ')) {
          return <h4 key={index} className="mt-4 text-sm font-semibold text-foreground">{parseInline(value.slice(4), isUser)}</h4>;
        }
        if (value.startsWith('## ')) {
          return <h3 key={index} className="mt-5 border-b border-ui-border pb-2 text-base font-semibold text-foreground">{parseInline(value.slice(3), isUser)}</h3>;
        }
        if (/^[-*]\s/.test(value)) {
          return (
            <div key={index} className="flex items-start gap-2 pl-1">
              <span className={cn('mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full', isUser ? 'bg-blue-100' : 'bg-primary')} aria-hidden="true" />
              <span>{parseInline(value.replace(/^[-*]\s+/, ''), isUser)}</span>
            </div>
          );
        }
        if (value.startsWith('> ')) {
          return <blockquote key={index} className="my-2 rounded-r-xl border-l-2 border-primary/60 bg-blue-400/5 px-4 py-2 text-sm text-slate-300">{parseInline(value.slice(2), isUser)}</blockquote>;
        }
        return <p key={index}>{parseInline(line, isUser)}</p>;
      })}
    </div>
  );
}

function parseInline(text, isUser) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={match.index} className={cn('font-semibold', isUser ? 'text-white' : 'text-foreground')}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<code key={match.index} className={cn('rounded-md border px-1.5 py-0.5 font-mono text-xs', isUser ? 'border-white/20 bg-white/10 text-white' : 'border-ui-border bg-canvas text-blue-200')}>{token.slice(1, -1)}</code>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length ? parts : text;
}
