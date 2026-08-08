export default function DashboardLoading() {
  return (
    <div className="animate-pulse" aria-busy aria-label="Memuat halaman">
      <div className="bg-muted h-8 w-64 rounded-md" />
      <div className="bg-muted mt-2 h-4 w-80 rounded-md" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-muted h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
