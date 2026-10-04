import { AlertCircle, Bot, UserRound } from 'lucide-react';
import MarkdownRenderer from '../common/MarkdownRenderer';
import StatusBadge from '../ui/StatusBadge';
import AgentProgress from './AgentProgress';

export default function ConversationTimeline({ messages, runs, onCancelRun }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
      {messages.map((message) => {
        const isUser = message.sender === 'user';
        return (
          <div key={message.id}>
          <article className={`mb-7 flex gap-3 animate-fade-up ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${isUser ? 'border-blue-400/30 bg-blue-500/15 text-blue-200' : message.isError ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-violet-400/25 bg-violet-400/10 text-violet-200'}`}>
              {isUser ? <UserRound className="h-4 w-4" aria-hidden="true" /> : message.isError ? <AlertCircle className="h-4 w-4" aria-hidden="true" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
            </div>
            <div className={`min-w-0 max-w-[min(100%,42rem)] ${isUser ? 'rounded-2xl rounded-tr-md bg-blue-600 px-4 py-3.5 text-white' : 'flex-1'}`}>
              {!isUser && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-300">EduRef AI</span>
                  {message.isStreaming && <StatusBadge status="PROCESSING" label="Đang phản hồi" />}
                  {message.isError && <StatusBadge status="FAILED" label="Cần thử lại" />}
                </div>
              )}
              <MarkdownRenderer content={message.text} isUser={isUser} />
              <p className={`mt-2 text-[11px] ${isUser ? 'text-blue-100/70' : 'text-slate-500'}`}>{message.timestamp || ''}</p>
            </div>
          </article>
          {isUser && message.runId && runs?.[message.runId] && (
            <div className="pl-0 sm:pl-11">
              <AgentProgress run={runs[message.runId]} onCancel={onCancelRun} />
            </div>
          )}
          </div>
        );
      })}
    </div>
  );
}
