import { ArrowRight, ScanLine } from 'lucide-react';

export default function VerifyEntry({ onNavigate }) {
  return (
    <a className="workspace-verify-entry" href="?tab=verify" onClick={(event) => {
      if (!onNavigate || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      onNavigate('VERIFY_HARNESS');
    }}>
      <ScanLine size={20} aria-hidden="true" />
      <span><strong>Kiểm thử 5 ca Track A</strong><small>Mở Verify · Chưa chạy test tại đây</small></span>
      <ArrowRight size={17} aria-hidden="true" />
    </a>
  );
}
