"use client";

import { useMemo, useState } from "react";
import Modal from "./Modal";

type Exercise = {
  id: number;
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  difficultyLevel?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
};

export default function ExerciseCatalogModal({
  open,
  onClose,
  exercises,
  onSelect,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return exercises;

    return exercises.filter((ex) => {
      const hay = [
        ex.name,
        ex.muscleGroup ?? "",
        ex.equipment ?? "",
        ex.difficultyLevel ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(term);
    });
  }, [q, exercises]);

  return (
    <Modal open={open} onClose={onClose} title="Catálogo de exercícios" maxWidthClassName="max-w-3xl">
      {/* busca (fica no topo do conteúdo e o resto rola) */}
      <div className="sticky top-0 bg-background pb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, músculo, equipamento..."
          className="
            w-full rounded-xl border border-border bg-background
            px-3 py-2 text-sm outline-none
            focus:ring-2 focus:ring-primary/30
          "
        />
        <div className="mt-2 text-xs text-muted-foreground">
          {filtered.length} exercício(s)
        </div>
      </div>

      {/* lista */}
      <div className="mt-3 grid gap-2">
        {filtered.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => {
              onSelect(ex);
              onClose();
            }}
            className="
              w-full text-left rounded-xl border border-border
              p-3 hover:bg-muted transition
            "
          >
            <div className="font-medium">{ex.name}</div>
            <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
              {ex.muscleGroup ? <span>Músculo: {ex.muscleGroup}</span> : null}
              {ex.equipment ? <span>Equip.: {ex.equipment}</span> : null}
              {ex.difficultyLevel ? <span>Nível: {ex.difficultyLevel}</span> : null}
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
            Nenhum exercício encontrado.
          </div>
        )}
      </div>
    </Modal>
  );
}
