"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eraser, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { NativeSelect } from "@/components/common/native-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  clearDoneShoppingNotes,
  createShoppingNote,
  deleteShoppingNote,
  toggleShoppingNote,
} from "@/server/actions/inventory";
import type { ShoppingNoteRow } from "@/server/queries/inventory";
import type { MemberOption } from "@/server/queries/users";

/**
 * Free text, because the derived list can only ever name things already in the
 * shed. A new tool, a repair, a roll of twine nobody has registered — those
 * have nowhere else to go.
 */
export function ShoppingNotes({
  notes,
  members,
}: {
  notes: ShoppingNoteRow[];
  members: MemberOption[];
}) {
  const [text, setText] = useState("");
  const [actorId, setActorId] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const done = notes.filter((note) => note.done).length;

  const run = (
    action: (formData: FormData) => Promise<{ ok: boolean; message?: string }>,
    fields: Record<string, string>,
    after?: () => void,
  ) =>
    startTransition(async () => {
      const formData = new FormData();
      for (const [key, value] of Object.entries(fields)) {
        formData.set(key, value);
      }

      const result = await action(formData);

      if (!result.ok) {
        toast.error(result.message ?? "Gagal menyimpan.");
        return;
      }

      after?.();
      router.refresh();
    });

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Tambahan</h3>
        {done > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await clearDoneShoppingNotes();
                toast.success("Yang sudah dibeli dibersihkan.");
                router.refresh();
              })
            }
          >
            <Eraser className="size-3.5" aria-hidden />
            Bersihkan {done} yang selesai
          </Button>
        ) : null}
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          run(createShoppingNote, { text, actorId }, () => setText(""));
        }}
      >
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Tali rafia 2 roll, servis tangki…"
          aria-label="Tambah catatan belanja"
          className="min-w-48 flex-1"
        />
        <NativeSelect
          value={actorId}
          onChange={(event) => setActorId(event.target.value)}
          aria-label="Dicatat oleh"
          className="w-36"
        >
          <option value="">— siapa —</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </NativeSelect>
        <Button type="submit" size="sm" disabled={pending || !text.trim()}>
          <Plus className="size-4" aria-hidden />
          Tambah
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          Belum ada catatan tambahan.
        </p>
      ) : (
        <ul className="grid gap-1">
          {notes.map((note) => (
            <li
              key={note.id}
              className="hover:bg-muted/40 flex items-center gap-2 rounded-md px-2 py-1.5"
            >
              <Checkbox
                checked={note.done}
                disabled={pending}
                aria-label={`Tandai ${note.text} sudah dibeli`}
                onCheckedChange={(checked) =>
                  run(toggleShoppingNote, {
                    noteId: note.id,
                    done: String(Boolean(checked)),
                  })
                }
              />
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  note.done && "text-muted-foreground line-through",
                )}
              >
                {note.text}
                {note.actor ? (
                  <span className="text-muted-foreground ml-2 text-xs">
                    {note.actor.name}
                  </span>
                ) : null}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                disabled={pending}
                aria-label={`Hapus ${note.text}`}
                onClick={() => run(deleteShoppingNote, { noteId: note.id })}
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
