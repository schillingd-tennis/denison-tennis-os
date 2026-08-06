/**
 * BP-034A — Workspace Interaction Framework (Right Drawer Foundation).
 *
 * Shared UI library for context-preserving drawers. Prefer DrawerManager
 * (`openDrawer` / `closeDrawer` / `replaceDrawer`) over local drawer state.
 */

export { default as WorkspaceDrawer } from "./WorkspaceDrawer";
export { default as DrawerOverlay } from "./DrawerOverlay";
export { default as DrawerHeader } from "./DrawerHeader";
export { default as DrawerBody } from "./DrawerBody";
export { default as DrawerFooter, DrawerFooterActions } from "./DrawerFooter";
export {
  DrawerManagerProvider,
  useDrawerManager,
} from "./DrawerManager";
export type { DrawerAction, DrawerDescriptor } from "./types";
