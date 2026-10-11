import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { client, useSession } from '@/react-app/shared/api';
import { formatRelativeTime } from '@/react-app/shared/lib';
import { Button, Card } from '@/react-app/shared/ui';
import type { BreweryNoteFormInput } from '@/shared/schemas/brewery-note';
import { BreweryNoteForm } from './BreweryNoteForm';

const NOTES_SKELETON_WIDTHS = ['w-2/3', 'w-1/2'];

/**
 * 酒蔵ノート。列の長さ・売り切れ・混雑など、酒以外の一次情報を共有する。
 * 誰でも読めて、投稿はサインインが必要。編集・削除は自分のノートだけに出る。
 */
export function BreweryNotes({ breweryId }: { breweryId: number }) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  // 投稿に成功したら入力欄を作り直して空にする
  const [formKey, setFormKey] = useState(0);

  const notesQuery = useQuery({
    queryKey: ['brewery-notes', breweryId],
    queryFn: async () => {
      const res = await client.api.breweries[':id'].notes.$get({
        param: { id: String(breweryId) },
      });
      if (!res.ok) {
        throw new Error('酒蔵ノートを取得できませんでした');
      }
      return res.json();
    },
  });

  const invalidateNotes = () =>
    queryClient.invalidateQueries({ queryKey: ['brewery-notes', breweryId] });

  const createNote = useMutation({
    mutationFn: async (input: BreweryNoteFormInput) => {
      const res = await client.api.breweries[':id'].notes.$post({
        param: { id: String(breweryId) },
        json: input,
      });
      if (!res.ok) {
        throw new Error('ノートを投稿できませんでした');
      }
      return res.json();
    },
    onSuccess: () => {
      setFormKey((key) => key + 1);
      void invalidateNotes();
    },
  });

  const updateNote = useMutation({
    mutationFn: async ({ noteId, input }: { noteId: number; input: BreweryNoteFormInput }) => {
      const res = await client.api.breweries[':id'].notes[':noteId'].$put({
        param: { id: String(breweryId), noteId: String(noteId) },
        json: input,
      });
      if (!res.ok) {
        throw new Error('ノートを保存できませんでした');
      }
      return res.json();
    },
    onSuccess: () => {
      setEditingNoteId(null);
      void invalidateNotes();
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: number) => {
      const res = await client.api.breweries[':id'].notes[':noteId'].$delete({
        param: { id: String(breweryId), noteId: String(noteId) },
      });
      if (!res.ok) {
        throw new Error('ノートを削除できませんでした');
      }
      return res.json();
    },
    onSuccess: () => {
      void invalidateNotes();
    },
  });

  const notes = notesQuery.data?.items ?? [];
  const mutationError =
    createNote.error instanceof Error
      ? createNote.error.message
      : updateNote.error instanceof Error
        ? updateNote.error.message
        : deleteNote.error instanceof Error
          ? deleteNote.error.message
          : '';

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">酒蔵ノート（{notes.length}）</h2>

      {session ? (
        <BreweryNoteForm
          key={formKey}
          submitLabel="ノートを投稿"
          isSubmitting={createNote.isPending}
          onSubmit={async (input) => {
            await createNote.mutateAsync(input);
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">ノートを投稿するにはサインインが必要です。</p>
      )}
      {mutationError.length > 0 && <p className="text-sm text-destructive">{mutationError}</p>}

      {notesQuery.isPending ? (
        <div role="status" aria-label="読み込み中" className="flex flex-col gap-3">
          {NOTES_SKELETON_WIDTHS.map((width) => (
            <Card key={width} className="h-20 p-4">
              <div className={`h-4 animate-pulse rounded-full bg-foreground/10 ${width}`} />
            </Card>
          ))}
        </div>
      ) : notesQuery.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-border py-6 pl-4">
          <p className="text-sm font-medium">
            {notesQuery.error instanceof Error
              ? notesQuery.error.message
              : '酒蔵ノートを取得できませんでした'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void notesQuery.refetch()}
            disabled={notesQuery.isFetching}
          >
            {notesQuery.isFetching ? '再試行中…' : '再試行'}
          </Button>
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <p className="text-sm font-medium">まだノートがありません</p>
          <p className="mt-1 text-sm text-muted-foreground">
            会場で気づいたことを最初に共有してみましょう。
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4"
            >
              {editingNoteId === note.id ? (
                <BreweryNoteForm
                  initialComment={note.comment}
                  submitLabel="更新する"
                  isSubmitting={updateNote.isPending}
                  showNotifyDiscord={false}
                  onSubmit={async (input) => {
                    await updateNote.mutateAsync({ noteId: note.id, input });
                  }}
                  onCancel={() => setEditingNoteId(null)}
                />
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{note.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(note.createdAt, notesQuery.dataUpdatedAt)}
                    </span>
                    {session?.user.id === note.userId && (
                      <div className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="xs" onClick={() => setEditingNoteId(note.id)}>
                          編集
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          disabled={deleteNote.isPending && deleteNote.variables === note.id}
                          onClick={() => {
                            deleteNote.mutate(note.id);
                          }}
                        >
                          削除
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm leading-6 break-words whitespace-pre-wrap">
                    {note.comment}
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        酒以外の情報（列の長さ・売り切れ・混雑など）を共有できます。
        <Link to="/sakes" className="ml-1 underline-offset-4 hover:underline">
          お酒のレビューはこちら
        </Link>
      </p>
    </section>
  );
}
