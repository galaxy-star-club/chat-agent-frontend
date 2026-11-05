"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function AuthControls() {
  return <div className="flex items-center gap-2">
    <Show when="signed-out">
      <SignInButton mode="modal"><Button type="button">Sign in</Button></SignInButton>
      <SignUpButton mode="modal"><Button type="button">Sign up</Button></SignUpButton>
    </Show>
    <Show when="signed-in"><UserButton /></Show>
  </div>;
}
