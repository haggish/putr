import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NoteForm } from "./note-form";
import { toggleNote, deleteNote } from "./actions";

// Always render fresh data in this demo.
export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const notes = await prisma.note.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <p className="text-sm text-neutral-500">
          A full CRUD example using Server Actions, Prisma, and Zod validation.
        </p>
      </div>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <NoteForm />
      </section>

      <section className="space-y-2">
        {notes.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No notes yet. Add one above (or run <code>npm run db:seed</code>).
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex items-start justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      "font-medium",
                      note.done && "text-neutral-400 line-through",
                    )}
                  >
                    {note.title}
                  </p>
                  {note.body ? (
                    <p className="truncate text-sm text-neutral-500">
                      {note.body}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={toggleNote.bind(null, note.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      {note.done ? "Undo" : "Done"}
                    </Button>
                  </form>
                  <form action={deleteNote.bind(null, note.id)}>
                    <Button type="submit" variant="destructive" size="sm">
                      Delete
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
