export default function ChatSuggestions({ suggestions, onChoose, disabled = false }) {
  if (!suggestions.length) return null;
  return <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3" aria-label="Gợi ý theo câu trả lời">
    {suggestions.map(suggestion => <button key={suggestion.id} type="button" disabled={disabled}
      onClick={() => onChoose(suggestion)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-left text-xs font-medium text-blue-900 transition-colors hover:bg-blue-100 disabled:opacity-50">
      {suggestion.label}
    </button>)}
  </div>;
}
