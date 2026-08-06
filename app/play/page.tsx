import Link from "next/link";
import { GameCanvas } from "./game-canvas";

export const metadata = {
  title: "Penultimate I — The Ring",
};

export default function PlayPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Penultimate I — The Ring
          </h1>
          <Link
            href="/play/create"
            className="text-sm text-neutral-500 hover:text-neutral-800"
          >
            New party →
          </Link>
        </div>
        <p className="text-neutral-600">
          Berlin inside the S-Bahn Ring. Explore with the keyboard, enter venues
          to shop and equip your party, and survive the encounters. Your party
          and progress save to the database.
        </p>
      </section>

      <GameCanvas />
    </div>
  );
}
