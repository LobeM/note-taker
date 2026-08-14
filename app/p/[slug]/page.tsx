export default async function PublicNotePage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Public note</h1>
      <p className="mt-2 text-sm opacity-70">
        Shared note <code className="font-mono">{slug}</code>. The read-only
        title and content go here.
      </p>
    </div>
  );
}
