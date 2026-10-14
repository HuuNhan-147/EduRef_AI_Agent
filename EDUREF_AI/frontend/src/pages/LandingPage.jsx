import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, FileCheck2, GitBranch, GraduationCap, Landmark, ScanLine, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import Brand from '../components/common/Brand';
import AnimatedNumber from '../components/landing/AnimatedNumber';
import FeatureVisual from '../components/landing/FeatureVisual';
import useLandingMotion from '../hooks/useLandingMotion';
import useLandingHover from '../hooks/useLandingHover';
import { CONFIRMATION_FORMS } from './StudentWorkspacePage';

export const LANDING_FACTS = [
  { value: CONFIRMATION_FORMS.length, label: 'Biểu mẫu học vụ', detail: 'Một điểm bắt đầu cho các yêu cầu khác nhau.' },
  { value: 3, label: 'Nhóm bất định', detail: 'Thiếu dữ kiện · Ngoài policy · Vượt thẩm quyền.' },
  { value: 5, label: 'Ca mẫu Verify Track A', detail: 'Bộ kiểm thử kỳ vọng 3 AUTO : 2 ESCALATE.' },
];

const CAPABILITIES = [
  { number: '01', icon: GraduationCap, visual: 'forms', label: 'BIỂU MẪU', title: 'Xác nhận cho việc học và cuộc sống', description: 'Giấy xác nhận sinh viên chung, giảm trừ gia cảnh và xác nhận nợ môn.', forms: 'Xác nhận chung · Thuế TNCN · Nợ môn' },
  { number: '02', icon: Landmark, visual: 'documents', label: 'HỒ SƠ', title: 'Đúng biểu mẫu, rõ thông tin', description: 'Vay vốn NHCSXH hoặc tạm hoãn nghĩa vụ quân sự — bắt đầu từ yêu cầu của bạn.', forms: 'Vay vốn · Tạm hoãn NVQS' },
  { number: '03', icon: GitBranch, visual: 'routing', label: 'ĐIỀU PHỐI', title: 'Đúng nơi, đúng thẩm quyền', description: 'Ca thường quy được xử lý theo policy. Ca ngoại lệ được chuyển tiếp kèm câu hỏi cụ thể.', forms: 'Tự động hóa có giới hạn' },
];

export default function LandingPage({ active, visible, onNavigate, children }) {
  const pageRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const motionAllowed = !reducedMotion && !coarsePointer;
  useLandingMotion(pageRef, active, motionAllowed);
  useLandingHover(pageRef, active, motionAllowed);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = window.matchMedia('(pointer: coarse)');
    const reset = () => {
      setReducedMotion(preference.matches);
      setCoarsePointer(pointer.matches);
    };
    reset();
    preference.addEventListener('change', reset);
    pointer.addEventListener('change', reset);
    return () => {
      preference.removeEventListener('change', reset);
      pointer.removeEventListener('change', reset);
    };
  }, []);

  const openVerify = (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onNavigate('VERIFY_HARNESS');
  };

  return (
    <div ref={pageRef} className={active ? 'landing-page' : 'workspace-stage'} hidden={!visible} data-motion={motionAllowed ? 'running' : 'paused'}>
      {active && (
        <>
          <div className="landing-reading-progress" aria-hidden="true" />
          <div className="landing-scene" aria-hidden="true">
            <div className="scene-grid-plane motion-decor" />
            <span className="scene-orb scene-orb-one motion-decor" />
            <span className="scene-orb scene-orb-two motion-decor" />
            <span className="scene-glint scene-glint-one motion-decor" />
            <span className="scene-glint scene-glint-two motion-decor" />
          </div>
        </>
      )}
      <section key="hero" className={active ? 'landing-hero landing-container' : 'workspace-conversation'} aria-label={active ? 'Bắt đầu với EduRef' : 'Không gian trợ lý sinh viên'}>
        {active && (
          <div className="hero-copy" key="introduction">
            <div className="hero-prelude">
              <span className="eyebrow"><span className="eyebrow-line" /> HỌC VỤ · ORGANIZATION AI</span>
            </div>
            <h1 className="hero-headline">
              <span className="sr-only">Ít thủ tục hơn. Thêm thời gian cho bạn.</span>
              <span className="headline-line" aria-hidden="true"><span className="hero-word" style={{ '--word-order': 0 }}>Ít thủ tục hơn.</span></span>
              <span className="headline-line" aria-hidden="true"><span className="hero-word" style={{ '--word-order': 1 }}>Thêm thời gian</span></span>
              <span className="headline-line headline-line-accent" aria-hidden="true"><span className="hero-word" style={{ '--word-order': 2 }}><span className="hero-accent-text motion-decor">cho bạn.</span></span></span>
            </h1>
            <p className="hero-description">Một nơi để hỏi, gửi yêu cầu và theo dõi giấy xác nhận sinh viên. AI hỗ trợ xử lý; con người giữ quyền kiểm soát.</p>
            <div className="hero-actions">
              <button className="ui-button ui-button-primary" onClick={() => onNavigate('STUDENT_ASSISTANT')}>Mở không gian làm việc <ArrowRight size={17} aria-hidden="true" /></button>
              <a className="ui-text-link" href="#cach-hoat-dong">Tìm hiểu cách hoạt động <ArrowDown size={15} aria-hidden="true" /></a>
            </div>
            <div className="judge-entry">
              <ScanLine size={20} aria-hidden="true" />
              <p><strong>Dành cho Ban Giám Khảo</strong><span>Chạy 5 ca Track A, sau đó thử một tình huống mới.</span></p>
              <a href="?tab=verify" onClick={openVerify}>Verify <ArrowRight size={15} aria-hidden="true" /></a>
            </div>
          </div>
        )}
        <div className={active ? 'hero-chat-stage' : 'workspace-chat-stage'} key="conversation">
          <div className={active ? 'hero-chat-frame' : 'workspace-chat-frame'} onFocusCapture={() => { pageRef.current.dataset.chatFocused = 'true'; }} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) pageRef.current.dataset.chatFocused = 'false'; }}>
            {children}
          </div>
          {active && <p className="hero-chat-note"><ShieldCheck size={15} aria-hidden="true" /> Cùng Agent của hệ thống · Mở chat chính để xem đầy đủ hồ sơ và trạng thái.</p>}
        </div>
      </section>

      {active && (
        <>
          <section className="landing-facts landing-container" aria-label="Cấu trúc hệ thống hiện tại" data-reveal>
            <dl className="landing-facts-grid">
              {LANDING_FACTS.map(({ value, label, detail }, index) => (
                <div className="landing-fact" key={label} data-reveal style={{ '--reveal-delay': `${index * 110}ms` }}>
                  <dt>{label}</dt>
                  <dd className="landing-fact-number"><AnimatedNumber value={value} motionEnabled={motionAllowed} /><span className="fact-rule" aria-hidden="true" /></dd>
                  <dd className="landing-fact-detail">{detail}</dd>
                </div>
              ))}
            </dl>
            <p className="landing-facts-note">Số lượng tính năng và ca mẫu hiện tại — không phải số liệu hiệu suất hoặc kết quả Verify.</p>
          </section>
          <section className="landing-capabilities landing-container" id="dich-vu" data-reveal>
            <div className="section-heading"><span className="eyebrow">MỘT ĐIỂM BẮT ĐẦU</span><h2>Việc học vụ, bớt phức tạp.</h2><p>Năm biểu mẫu. Một trải nghiệm liền mạch, từ thông tin đầu vào đến trạng thái hồ sơ.</p></div>
            <div className="capability-grid">
              {CAPABILITIES.map(({ number, icon, visual, label, title, description, forms }, index) => (
                <article className="capability-card" key={number} data-reveal data-hover-depth style={{ '--reveal-delay': `${index * 110}ms` }}>
                  <div className="capability-top"><span className="capability-label">{label}</span><span>{number}</span></div>
                  <FeatureVisual icon={icon} variant={visual} />
                  <h3>{title}</h3><p>{description}</p><span className="capability-footnote">{forms}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="landing-process" id="cach-hoat-dong" data-reveal>
            <div className="landing-container process-grid">
              <div className="process-copy"><span className="eyebrow">MINH BẠCH TỪNG BƯỚC</span><h2>Tự động phần phù hợp.<br /><span>Con người ở đúng lúc.</span></h2><p>Không phải mọi yêu cầu đều giống nhau. EduRef làm rõ dữ kiện, đối chiếu policy và dừng để xin ý kiến khi cần.</p><button className="ui-text-link" onClick={() => onNavigate('AUDIT_EXPLORER')}>Xem dấu vết xử lý <ArrowRight size={16} aria-hidden="true" /></button></div>
              <ol className="process-steps">
                <li data-reveal><span className="process-step-icon"><SlidersHorizontal size={21} aria-hidden="true" /></span><div><span>01 / TIẾP NHẬN</span><h3>Bắt đầu bằng lời của bạn</h3><p>Trao đổi với trợ lý hoặc chọn biểu mẫu. Bổ sung thông tin khi hệ thống yêu cầu làm rõ.</p></div></li>
                <li data-reveal style={{ '--reveal-delay': '100ms' }}><span className="process-step-icon"><FileCheck2 size={21} aria-hidden="true" /></span><div><span>02 / ĐỐI CHIẾU</span><h3>Policy đặt ranh giới</h3><p>Ca thường quy đi theo quy định. Ngoại lệ chuyển tới cán bộ với dữ kiện và câu hỏi hành động.</p></div></li>
                <li data-reveal style={{ '--reveal-delay': '200ms' }}><span className="process-step-icon"><ShieldCheck size={21} aria-hidden="true" /></span><div><span>03 / THEO DÕI</span><h3>Biết hồ sơ đang ở đâu</h3><p>Xem trạng thái, kết quả và dấu vết xử lý để kiểm tra lại khi cần.</p></div></li>
              </ol>
            </div>
          </section>

          <section className="landing-closing landing-container" data-reveal>
            <div><span className="eyebrow"><Check size={15} aria-hidden="true" /> ÍT PHỨC TẠP. NHIỀU CHỦ ĐỘNG.</span><h2>Bạn cần giấy xác nhận<br />cho việc gì hôm nay?</h2></div>
            <div className="closing-actions"><button className="ui-button ui-button-primary" onClick={() => onNavigate('STUDENT_ASSISTANT')}>Bắt đầu với EduRef <ArrowRight size={17} aria-hidden="true" /></button><a className="ui-text-link" href="?tab=verify" onClick={openVerify}>Kiểm thử Verify Track A <ArrowRight size={15} aria-hidden="true" /></a></div>
          </section>
          <footer className="landing-footer landing-container"><Brand compact /><p>OrganizationAI · VNG Track A<br />Tự động hóa có giới hạn. Trải nghiệm lấy con người làm trung tâm.</p><a href="#dich-vu" className="ui-text-link">Khám phá dịch vụ <ArrowRight size={15} aria-hidden="true" /></a></footer>
        </>
      )}
    </div>
  );
}
