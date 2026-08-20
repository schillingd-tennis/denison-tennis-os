/**
 * View / workspace heading below ModulePageShell.
 *
 * Copy names the current view, not the module. Module identity lives in
 * ModulePageShell. Typography and spacing match the approved Rank view header.
 */
export default function ViewContextHeader({
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
