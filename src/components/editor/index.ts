/**
 * Universal Person Editor framework (BP-013).
 *
 * Generic editing primitives with no knowledge of `Person` — reusable by
 * any future workspace (Recruit, Parent, Coach, Operations, etc.). See
 * `docs/DECISIONS.md` (BP-013) for the intended usage pattern.
 */
export { FormProvider, useFormContext } from "./FormProvider";
export { useBeforeUnloadWarning, confirmDiscardIfDirty } from "./DirtyTracker";
export { default as EditableField } from "./EditableField";
export { default as EditableSection } from "./EditableSection";
export { default as EditorToolbar } from "./EditorToolbar";
export { default as ValidationMessage } from "./ValidationMessage";
export * from "./validators";
export * from "./utils";
export * from "./types";
