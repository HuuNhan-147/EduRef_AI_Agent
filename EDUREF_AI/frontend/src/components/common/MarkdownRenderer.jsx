// src/components/common/MarkdownRenderer.jsx
// Hiển thị văn bản phản hồi của AI có định dạng Markdown sạch sẽ, hỗ trợ cả giao diện User & AI

import React from 'react';

export default function MarkdownRenderer({ content = '', isUser = false }) {
  if (!content) return null;

  // Chuẩn hóa nếu LLM vô tình xuống dòng giữa ] và (
  const normalizedContent = String(content).replace(/\]\s*\n\s*\(/g, '](');
  const lines = normalizedContent.split('\n');

  return (
    <div
      className={`space-y-1.5 text-sm leading-relaxed break-words font-sans ${
        isUser ? 'text-white' : 'text-slate-800'
      }`}
    >
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // 1. Dòng trống
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // 2. Heading ###
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={idx}
              className={`font-bold text-sm mt-2 mb-1 flex items-center gap-1.5 ${
                isUser ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span className={`w-1 h-3.5 rounded-sm inline-block ${isUser ? 'bg-white' : 'bg-blue-600'}`}></span>
              {trimmed.replace('### ', '')}
            </h4>
          );
        }

        // 3. Heading ##
        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={idx}
              className={`font-bold text-base mt-2.5 mb-1 pb-0.5 border-b ${
                isUser ? 'text-white border-blue-400/40' : 'text-slate-900 border-slate-200'
              }`}
            >
              {trimmed.replace('## ', '')}
            </h3>
          );
        }

        // 4. Bullet points (* hoặc -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const bulletText = trimmed.replace(/^(\*|-)\s+/, '');
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className={`font-bold mt-1 text-xs ${isUser ? 'text-blue-200' : 'text-blue-600'}`}>•</span>
              <span className="flex-1">{parseInlineFormatting(bulletText, isUser)}</span>
            </div>
          );
        }

        // 5. Đoạn trích dẫn / Cảnh báo (>)
        if (trimmed.startsWith('> ')) {
          return (
            <div
              key={idx}
              className={`border-l-2 px-3 py-1.5 rounded-r text-xs italic my-1 ${
                isUser
                  ? 'bg-blue-800/60 border-blue-300 text-blue-100'
                  : 'bg-slate-100 border-slate-400 text-slate-700'
              }`}
            >
              {parseInlineFormatting(trimmed.replace('> ', ''), isUser)}
            </div>
          );
        }

        // 6. Dòng thường
        return <p key={idx}>{parseInlineFormatting(line, isUser)}</p>;
      })}
    </div>
  );
}

// Hàm hỗ trợ link, in đậm **bold** và inline `code`
function parseInlineFormatting(text, isUser = false) {
  if (!text) return null;
  const parts = [];

  // Regex nhận diện các khối: link bọc bold, link chứa bold, bold link nối, link thường, bold, code, bare URL
  const regex = /(\*\*\[.*?\]\(https?:\/\/[^\s)]+\)\*\*|\[\*\*.*?\*\*\]\(https?:\/\/[^\s)]+\)|\*\*\[.*?\]\*\*\s*\((?:https?:\/\/[^\s)]+)\)|\[.*?\]\(https?:\/\/[^\s)]+\)|\*\*.*?\*\*|`.*?`|https?:\/\/[^\s<)]+[^<.,:;"')\]\s])/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];

    // 1. Link dạng: **[Tiêu đề](https://...)**
    if (token.startsWith('**[') && token.endsWith(')**')) {
      const linkMatch = token.slice(2, -2).match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <strong key={match.index} className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`}>
            <a
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline break-all inline-flex items-center gap-0.5 cursor-pointer ${
                isUser ? 'text-white hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              {linkMatch[1]} <span className="text-[11px] no-underline">↗</span>
            </a>
          </strong>
        );
      } else {
        parts.push(token);
      }
    }
    // 2. Link dạng: [**Tiêu đề**](https://...)
    else if (token.startsWith('[**') && token.includes('**](')) {
      const linkMatch = token.match(/^\[\*\*(.*?)\*\*\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-bold underline break-all inline-flex items-center gap-0.5 cursor-pointer ${
              isUser ? 'text-white hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
            }`}
          >
            {linkMatch[1]} <span className="text-[11px] no-underline">↗</span>
          </a>
        );
      } else {
        parts.push(token);
      }
    }
    // 3. Link dạng: **[Tiêu đề]**(https://...) hoặc **[Tiêu đề]** (https://...)
    else if (token.startsWith('**[') && token.includes(']**') && token.includes('(')) {
      const linkMatch = token.match(/^\*\*\[(.*?)\]\*\*\s*\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <strong key={match.index} className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`}>
            <a
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline break-all inline-flex items-center gap-0.5 cursor-pointer ${
                isUser ? 'text-white hover:text-blue-200' : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              {linkMatch[1]} <span className="text-[11px] no-underline">↗</span>
            </a>
          </strong>
        );
      } else {
        parts.push(token);
      }
    }
    // 4. Markdown link chuẩn: [Tiêu đề](https://...)
    else if (token.startsWith('[') && token.includes('](')) {
      const linkMatch = token.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        parts.push(
          <a
            key={match.index}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className={`font-semibold underline break-all inline-flex items-center gap-0.5 cursor-pointer ${
              isUser ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
            }`}
          >
            {linkMatch[1]} <span className="text-[11px] no-underline">↗</span>
          </a>
        );
      } else {
        parts.push(token);
      }
    }
    // 5. Đường link trực tiếp: https://... hoặc http://...
    else if (token.startsWith('http://') || token.startsWith('https://')) {
      parts.push(
        <a
          key={match.index}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-semibold underline break-all inline-flex items-center gap-0.5 cursor-pointer ${
            isUser ? 'text-white hover:text-blue-100' : 'text-blue-600 hover:text-blue-800'
          }`}
        >
          {token} <span className="text-[11px] no-underline">↗</span>
        </a>
      );
    }
    // 6. In đậm: **bold** (Đệ quy phân tích bên trong để nếu có link con thì vẫn bấm được)
    else if (token.startsWith('**') && token.endsWith('**')) {
      const innerContent = token.slice(2, -2);
      parts.push(
        <strong
          key={match.index}
          className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`}
        >
          {parseInlineFormatting(innerContent, isUser)}
        </strong>
      );
    }
    // 7. Mã code: `code`
    else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className={`px-1.5 py-0.5 font-mono text-xs rounded border ${
            isUser
              ? 'bg-blue-800/80 text-blue-100 border-blue-600/60'
              : 'bg-slate-100 text-blue-700 border-slate-200'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
