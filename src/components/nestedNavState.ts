import type { NavChildItem, NavItem } from "./nav-items";
import { isNavChildActive, isNavItemActive } from "./nav-items";

export type NestedNavState = {
  parentActive: boolean;
  expanded: boolean;
  activeChildHref: string | null;
};

/**
 * Nested sidebar state is a pure function of the current pathname.
 * Nothing is remembered across route transitions.
 */
export function getNestedNavState(pathname: string, parent: NavItem): NestedNavState {
  const parentActive = isNavItemActive(pathname, parent.href);
  const activeChild = parent.children?.find((child) => isNavChildActive(pathname, child));
  return {
    parentActive,
    expanded: parentActive && Boolean(parent.children?.length),
    activeChildHref: activeChild?.href ?? null,
  };
}

export function isDirectoryChildActive(pathname: string, child: NavChildItem): boolean {
  return isNavChildActive(pathname, child);
}
