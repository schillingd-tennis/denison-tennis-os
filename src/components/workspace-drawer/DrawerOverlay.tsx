/**
 * BP-034A — Dimmed backdrop behind WorkspaceDrawer.
 * Click closes; page remains visible underneath.
 */
export default function DrawerOverlay({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Close drawer"
      tabIndex={-1}
      onClick={onClose}
      className={`absolute inset-0 bg-black/35 transition-opacity duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
