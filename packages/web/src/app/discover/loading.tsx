export default function Loading() {
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <div className="h-8 bg-card rounded w-48 animate-pulse mb-6" />
      <div className="h-12 bg-card rounded-full animate-pulse mb-8" />
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-card rounded-card animate-pulse" style={{ height: 400 }} />
        ))}
      </div>
    </div>
  );
}
