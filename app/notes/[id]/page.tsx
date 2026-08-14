export default async function NotePage(props: PageProps<"/notes/[id]">) {
  const { id } = await props.params;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Note editor</h1>
      <p className="mt-2 text-sm opacity-70">
        Editing note <code className="font-mono">{id}</code>. The title field,
        TipTap editor, share toggle, and delete button go here.
      </p>
    </div>
  );
}
