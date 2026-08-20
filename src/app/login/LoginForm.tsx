"use client";

import { useActionState } from "react";

import { login } from "./actions";

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-text-primary">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 w-full rounded-control border border-border bg-surface px-3 text-sm text-text-primary transition-colors duration-150 placeholder:text-text-secondary focus:border-denison-red focus:outline-none focus:ring-1 focus:ring-denison-red md:h-10"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-text-primary">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 w-full rounded-control border border-border bg-surface px-3 text-sm text-text-primary transition-colors duration-150 placeholder:text-text-secondary focus:border-denison-red focus:outline-none focus:ring-1 focus:ring-denison-red md:h-10"
        />
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-11 w-full rounded-control bg-denison-red text-sm font-semibold text-surface transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:h-10"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
