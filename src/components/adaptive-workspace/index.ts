/**
 * BP-035C — Adaptive Workspace Framework.
 *
 * Primary module surfaces live here. Navigation selects a workspace;
 * the surrounding page context stays fixed.
 */

export { default as AdaptiveWorkspace, AdaptiveWorkspacePlaceholder } from "./AdaptiveWorkspace";
export { default as AdaptiveWorkspaceHeader } from "./AdaptiveWorkspaceHeader";
export {
  MobileWorkspaceSectionHeader,
  WorkspaceAccentHeading,
  WorkspaceContent,
  WorkspaceField,
  WorkspaceFieldGrid,
  WorkspaceFieldGroup,
  WorkspaceMutedNote,
  WorkspaceReadOnlyValue,
  WorkspaceSection,
  WorkspaceSectionHeader,
  WorkspaceSplit,
  WorkspaceStack,
  WorkspaceStatusStrip,
  WorkspaceStatusStripItem,
} from "./WorkspaceContent";
export type { AdaptiveWorkspaceDefinition } from "./types";
export type { WorkspaceSectionTone } from "./WorkspaceContent";
