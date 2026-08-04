"use client";

import { useActionState, useEffect, useRef } from "react";
import { createNote, type ActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NoteForm() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createNote,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the form after a successful submit (no error returned).
  useEffect(() => {
    if (!pending && state === undefined) {
      formRef.current?.reset();
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="space-y-1">
        <Input name="title" placeholder="Note title…" required maxLength={120} />
      </div>
      <div className="space-y-1">
        <Input name="body" placeholder="Optional details…" maxLength={2000} />
      </div>
      {state?.error ? (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add note"}
      </Button>
    </form>
  );
}
