// frontend/src/components/MarkdownText.jsx
// ============================================
// MARKDOWN TEXT RENDERER — Render Markdown sạch đẹp cho AI Chat
// ============================================

import React from "react";

/**
 * Phân tích các inline token: **bold**, *italic*, `code`
 */
function parseInline(text) {
  if (!text) return null;

  // Regex nhận diện **bold**, *italic*, `code`
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-white tracking-wide">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-slate-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 bg-slate-900 border border-slate-700/60 rounded text-amber-300 font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function MarkdownText({ content }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements = [];
  let currentList = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-1">
          {currentList.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-200">
              <span className="text-amber-400 font-black mt-0.5">•</span>
              <span className="flex-1">{parseInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    // Dòng trống
    if (!trimmed) {
      flushList();
      elements.push(<div key={`br-${lineIdx}`} className="h-2" />);
      return;
    }

    // Danh sách gạch đầu dòng (- hoặc *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      currentList.push(trimmed.slice(2));
      return;
    }

    flushList();

    // Tiêu đề ###
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={lineIdx} className="text-sm font-bold text-amber-400 mt-2 mb-1">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    // Tiêu đề ##
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={lineIdx} className="text-base font-extrabold text-white mt-3 mb-1">
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    // Tiêu đề #
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h2 key={lineIdx} className="text-lg font-black text-amber-300 mt-3 mb-1 border-b border-slate-800 pb-1">
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Dòng văn bản bình thường
    elements.push(
      <p key={lineIdx} className="text-xs sm:text-sm text-slate-100 leading-relaxed">
        {parseInline(line)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
}
