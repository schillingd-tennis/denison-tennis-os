"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

export default function IntraSquadPlayerName({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  if (!onClick) {
    return <span className={className}>{children}</span>;
  }

  const select = onClick;

  function handleClick(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    select();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      event.stopPropagation();
      event.preventDefault();
      select();
    }
  }

  return (
    <button
      type="button"
      data-intra-squad-player-name=""
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer rounded-sm text-left font-medium text-text-primary underline-offset-2 hover:text-info hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info ${className}`}
    >
      {children}
    </button>
  );
}
