import type { ReactNode } from 'react';

export function Win({ title, icon, children, className = '', tone = 'navy' }: {
  title: string; icon?: ReactNode; children: ReactNode; className?: string; tone?: 'navy' | 'gray' | 'orange';
}) {
  const bar =
    tone === 'orange'
      ? { background: 'linear-gradient(90deg,#b34a00,#ff8b2e)' }
      : tone === 'gray'
        ? { background: 'linear-gradient(90deg,#5a5f6e,#8a93a5)' }
        : { background: 'linear-gradient(90deg,var(--navy-1),var(--navy-2))' };
  return (
    <section className={`bevel-out flex flex-col min-h-0 ${className}`}>
      <header className="flex items-center gap-2 px-2.5 py-1.5 text-white" style={bar}>
        {icon && <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
        <h2 className="font-disp tracking-wide text-[15px] leading-none drop-shadow-[1px_1px_0_rgba(0,0,30,0.6)] truncate">{title}</h2>
        <span className="ml-auto flex gap-1">
          <i className="block w-3.5 h-3.5 bg-[#d4d0c4] border border-[#4c4a42] shadow-[inset_1px_1px_0_#fffdf4]" />
          <i className="block w-3.5 h-3.5 bg-[#d4d0c4] border border-[#4c4a42] shadow-[inset_1px_1px_0_#fffdf4] hidden sm:block" />
          <i className="block w-3.5 h-3.5 bg-[#d4d0c4] border border-[#4c4a42] shadow-[inset_1px_1px_0_#fffdf4] relative after:content-[''] after:absolute after:inset-[3px] after:bg-[#4c4a42]" />
        </span>
      </header>
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
    </section>
  );
}

export function Btn({ children, onClick, disabled, primary, small, className = '', title }: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; primary?: boolean; small?: boolean; className?: string; title?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`btn98 ${primary ? 'btn-primary' : ''} font-bold ${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1.5 text-sm'} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------- inline SVG icons ---------- */
const I = ({ d, size = 14, fill = 'currentColor' }: { d: string; size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden>
    <path d={d} fill={fill} />
  </svg>
);

export const Icons = {
  coin: (s = 14) => <I size={s} d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 8 3zm-.9 1.8h1.8v1a2.2 2.2 0 0 1 1.6 1.9h-1.4c-.1-.5-.5-.8-1.1-.8-.7 0-1 .3-1 .7 0 1.1 2.8.6 2.8 2.6 0 .9-.7 1.5-1.9 1.6v1H7.1v-1a2.3 2.3 0 0 1-1.8-2h1.5c.1.6.5.9 1.2.9.7 0 1.1-.3 1.1-.8 0-1.2-2.8-.6-2.8-2.6 0-.9.7-1.5 1.8-1.6v-.9z" />,
  users: (s = 14) => <I size={s} d="M5.5 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm5.7 1.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM5.5 9c2.6 0 4.6 1.5 5.3 3.7l.4 1.3H-.2l.4-1.3C1.3 10.5 3.3 9 5.5 9zm5.7.9c1.7.3 3 1.4 3.5 3l.4 1.1h-3.3a6.6 6.6 0 0 0-1.4-2.3c.2-.6.5-1.2.8-1.8z" />,
  star: (s = 14) => <I size={s} d="M8 .8l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.2l-4.5 2.4.9-5L.8 6.1l5-.7z" />,
  flask: (s = 14) => <I size={s} d="M6 1h4v1.5h-1V5l4.7 8.2A1.5 1.5 0 0 1 12.4 15H3.6a1.5 1.5 0 0 1-1.3-2.3L7 5V2.5H6V1zm2 6.4L4.8 13h6.4L8 7.4z" />,
  bolt: (s = 14) => <I size={s} d="M9.5 0L3 9h3.5L5 16l7.5-9.5H8.5L9.5 0z" />,
  clock: (s = 14) => <I size={s} d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 1.8a5.2 5.2 0 1 1 0 10.4A5.2 5.2 0 0 1 8 2.8zM7.3 4h1.4v3.6l2.8 1.7-.7 1.2-3.5-2.1V4z" />,
  person: (s = 14) => <I size={s} d="M8 1.5a3.2 3.2 0 1 1 0 6.4A3.2 3.2 0 0 1 8 1.5zM8 9.4c3 0 5.3 1.7 5.8 4.3l.2 1H2l.2-1C2.7 11.1 5 9.4 8 9.4z" />,
  hammer: (s = 14) => <I size={s} d="M2.6 1.4L7 3.6 6 5.6l1 .5L10.5 2l3 1.5-2 4-1-.5-.4 1L4.6 5.2l.4-1-1-.5-1.4 1zM10 7.5l4 4-1.5 1.5-4-4 1.5-1.5zM3 8l1.5 1.5-2.7 5L0 12.7 3 8z" />,
  bag: (s = 14) => <I size={s} d="M5 2a3 3 0 0 1 6 0h2.5a1 1 0 0 1 1 1l.9 10.5a1 1 0 0 1-1 1.1H1.6a1 1 0 0 1-1-1.1L1.5 3a1 1 0 0 1 1-1H5zm1.5 0A1.5 1.5 0 0 0 8 3.4 1.5 1.5 0 0 0 9.5 2h-3z" />,
  coffee: (s = 14) => <I size={s} d="M2 5h9v1.5h1.5A2.5 2.5 0 0 1 15 9a2.5 2.5 0 0 1-2.5 2.5H11V12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm9 3h1.5a1 1 0 0 0 0-2H11v2zM3 15h9v1H3v-1z" />,
  scroll: (s = 14) => <I size={s} d="M3 1h8a2 2 0 0 1 2 2v1h2a1 1 0 0 1 1 1v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H1a1 1 0 0 1-1-1V3a2 2 0 0 1 2-2h1zm1 2v10a1 1 0 0 0 1 1h9V4a1 1 0 0 0-1-1H4zm2 2h5v1.4H6V5zm0 2.6h6V9H6V7.6zm0 2.6h6v1.4H6v-1.4z" />,
  chip: (s = 14) => <I size={s} d="M5 0h1.6v2H9.4V0H11v2h2a1 1 0 0 1 1 1v2h2v1.6h-2V9.4H16V11h-2v2a1 1 0 0 1-1 1h-2v2H9.4v-2H6.6v2H5v-2H3a1 1 0 0 1-1-1v-2H0V9.4h2V6.6H0V5h2V3a1 1 0 0 1 1-1h2V0zm0 4v6h6V4H5zm1.5 1.5h3v3h-3v-3z" />,
  heart: (s = 14) => <I size={s} d="M8 14S1.2 9.6 1.2 5.3A3.5 3.5 0 0 1 8 3.6a3.5 3.5 0 0 1 6.8 1.7C14.8 9.6 8 14 8 14z" />,
  next: (s = 14) => <I size={s} d="M2 1.5L10 8l-8 6.5v-3.4L6.4 8 2 4.9V1.5zm8 0l8 6.5-8 6.5v-3.4L14.4 8 10 4.9V1.5z" />,
  globe: (s = 14) => <I size={s} d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm5.5 6.2h-2.3a11 11 0 0 0-.8-3.4 5.6 5.6 0 0 1 3.1 3.4zM8 2.5c.8 0 1.7 1.6 2 4.7H6c.3-3.1 1.2-4.7 2-4.7zM4.6 3.8a11 11 0 0 0-.8 3.4H1.5a5.6 5.6 0 0 1 3.1-3.4zM1.5 8.8h2.3a11 11 0 0 0 .8 3.4 5.6 5.6 0 0 1-3.1-3.4zM8 13.5c-.8 0-1.7-1.6-2-4.7h4c-.3 3.1-1.2 4.7-2 4.7zm3.4-1.3a11 11 0 0 0 .8-3.4h2.3a5.6 5.6 0 0 1-3.1 3.4z" />,
  flag: (s = 14) => <I size={s} d="M3 0h1.5v1.2C6 0 8.5 2.5 11 1.5V8c-2.5 1-5-1.5-6.5 0V16H3V0z" />,
  doc: (s = 14) => <I size={s} d="M3 0h7l3 3v13H3V0zm7 1.2V4h2.8L10 1.2zM5 6h6v1.2H5V6zm0 2.4h6v1.2H5V8.4zm0 2.4h4v1.2H5v-1.2z" />,
};

export function Spark({ data, w = 150, h = 36 }: { data: number[]; w?: number; h?: number }) {
  if (data.length < 2) return <div className="h-9" />;
  const max = Math.max(...data, 10);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - (v / max) * (h - 8)}`).join(' ');
  return (
    <svg width={w} height={h} className="block">
      <polyline points={pts} fill="none" stroke="#1c63c9" strokeWidth="2" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="rgba(28,99,201,0.12)" />
      <circle cx={w} cy={h - 3 - (data[data.length - 1] / max) * (h - 8)} r="3" fill="#ff6a00" />
    </svg>
  );
}
