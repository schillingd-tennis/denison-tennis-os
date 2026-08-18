/**
 * BP-035C — Adaptive Workspace Framework.
 *
 * Primary module surfaces live here. Navigation selects a workspace;
 * the surrounding page context stays fixed.
 */

export { default as AdaptiveWorkspace, AdaptiveWorkspacePlaceholder } from "./AdaptiveWorkspace";
export { default as AdaptiveWorkspaceHeader } from "./AdaptiveWorkspaceHeader";
export {
  WorkspaceAccentHeading,
  WorkspaceContent,
  WorkspaceField,
  WorkspaceFieldGrid,
  WorkspaceFieldGroup,
  WorkspaceMutedNote,
  WorkspaceReadOnlyValue,
  WorkspaceSection,
  WorkspaceSplit,
  WorkspaceStack,
} from "./WorkspaceContent";
export type { AdaptiveWorkspaceDefinition } from "./types";
