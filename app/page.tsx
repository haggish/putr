import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

const stack = [
  ["Next.js 16 (App Router)", "React 19 framework — UI + API in one codebase"],
  ["TypeScript", "Strict mode, end-to-end types"],
  ["PostgreSQL + Prisma 7", "Relational DB with a type-safe ORM"],
  ["Tailwind CSS v4", "Utility-first styling + shadcn/ui components"],
  ["Zod", "Runtime validation for forms & Server Actions"],
  ["Vitest", "Fast unit tests"],
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          The Boring Full-Stack Starter
        </h1>
        <p className="text-neutral-600">
          Proven, widely used, and current. Everything you need and nothing you
          have to think about. Start building in the <code>app/</code> folder.
        </p>
        <div className="flex gap-3">
          <Link href="/notes" className={buttonVariants()}>
            Try the Notes demo →
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          What&apos;s in the box
        </h2>
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          {stack.map(([name, desc]) => (
            <li key={name} className="flex flex-col gap-0.5 px-4 py-3">
              <span className="font-medium">{name}</span>
              <span className="text-sm text-neutral-500">{desc}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
