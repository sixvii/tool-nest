const styles = {
  h1: 'text-4xl font-bold text-slate-900',
  h2: 'text-2xl font-bold text-slate-900 tracking-tight',
  h3: 'text-xl font-bold text-slate-800',
  h4: 'text-base font-bold text-slate-700',
};

export default function Heading({ as: Tag = 'h2', children, className = '' }) {
  return <Tag className={`${styles[Tag] ?? styles.h2} ${className}`}>{children}</Tag>;
}
