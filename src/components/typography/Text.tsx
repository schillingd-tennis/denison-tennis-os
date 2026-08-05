import type { ElementType, ReactNode } from "react";

import { typeClass, type TypeRole } from "./roles";

/**
 * Typed text primitive — applies a `typeRole` class stack.
 * Does not add spacing; pass layout classes via `className`.
 */
export default function Text({
  role,
  as: Tag = "span",
  className,
  children,
  title,
}: {
  role: TypeRole;
  as?: ElementType;
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <Tag className={typeClass(role, className)} title={title}>
      {children}
    </Tag>
  );
}
