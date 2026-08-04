export default function PlayerAvatar({
  photoUrl,
  initials,
  size = 40,
}: {
  photoUrl?: string;
  initials: string;
  size?: number;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatar photos may come from arbitrary external URLs
      <img
        src={photoUrl}
        alt=""
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: Math.max(size * 0.36, 11) }}
      className="flex shrink-0 items-center justify-center rounded-full bg-sidebar font-semibold text-surface"
    >
      {initials}
    </div>
  );
}
