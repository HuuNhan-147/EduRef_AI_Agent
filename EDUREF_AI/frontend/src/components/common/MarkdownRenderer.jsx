// src/components/common/MarkdownRenderer.jsx
// Hiển thị văn bản phản hồi của AI có định dạng Markdown sạch sẽ, hỗ trợ cả giao diện User & AI

import React from 'react';

export default function MarkdownRenderer({ content = '', isUser = false }) {
  if (!content) return null;

  // Tách dòng văn bản và render các block
  const lines = String(content).split('\n');

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

// Hàm hỗ trợ in đậm **bold** và inline `code`
function parseInlineFormatting(text, isUser = false) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong
          key={match.index}
          className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`}
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
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
