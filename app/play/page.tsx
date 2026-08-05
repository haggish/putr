import { GameCanvas } from "./game-canvas";

export const metadata = {
  title: "Penultimate I — The Ring",
};

export default function PlayPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Penultimate I — The Ring
        </h1>
        <p className="text-neutral-600">
          A placeholder world for now — walk around with the keyboard. The real
          inside-the-Ring Berlin map arrives with the world-data pipeline; the
          border tiles stand in for the Ringbahn.
        </p>
      </section>

      <GameCanvas />
    </div>
  );
}
