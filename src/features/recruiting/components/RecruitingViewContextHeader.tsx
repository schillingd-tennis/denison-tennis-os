/**
 * Shared eyebrow / title / subtitle block for Recruiting List and Rank views.
 * Rank View is the structural reference — class names must stay in sync.
 */
export default function RecruitingViewContextHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-text-secondary uppercase">
        {eyebrow}
      </p>
      <h2 className="text-xl font-semibold tracking-tight text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
    </div>
  );
}
