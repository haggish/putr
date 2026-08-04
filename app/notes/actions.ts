"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  body: z.string().trim().max(2000).optional().default(""),
});

export type ActionState = { error?: string } | undefined;

export async function createNote(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createNoteSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") ?? "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.note.create({ data: parsed.data });
  revalidatePath("/notes");
  return undefined;
}

export async function toggleNote(id: string): Promise<void> {
  const note = await prisma.note.findUnique({ where: { id } });
  if (!note) return;
  await prisma.note.update({
    where: { id },
    data: { done: !note.done },
  });
  revalidatePath("/notes");
}

export async function deleteNote(id: string): Promise<void> {
  await prisma.note.delete({ where: { id } });
  revalidatePath("/notes");
}
