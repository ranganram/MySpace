export function PageHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <div className="text-[30px] font-bold leading-tight tracking-tight text-text">{title}</div>
      <div className="mt-1 text-[13px] text-text3">{sub}</div>
    </div>
  );
}
