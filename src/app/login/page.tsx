import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import LoginForm from "./LoginForm";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(next ?? "/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-background px-4">
      <div className="w-full max-w-sm rounded-card border border-border bg-surface p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-control bg-denison-red text-lg font-semibold text-surface">
            D
          </div>
          <h1 className="text-xl font-semibold text-text-primary">Denison Tennis OS</h1>
          <p className="mt-1 text-sm text-text-secondary">Sign in to continue.</p>
        </div>

        <LoginForm next={next} />
      </div>
    </div>
  );
}
