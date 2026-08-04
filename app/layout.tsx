import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next.js Full-Stack Starter",
  description: "A boring, reliable Next.js + TypeScript + Prisma + Postgres stack.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-neutral-200 bg-white">
          <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-semibold">
              🥱 Boring Stack
            </Link>
            <div className="flex items-center gap-4 text-sm text-neutral-600">
              <Link href="/" className="hover:text-neutral-900">
                Home
              </Link>
              <Link href="/notes" className="hover:text-neutral-900">
                Notes
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
      </body>
    </html>
  );
}
