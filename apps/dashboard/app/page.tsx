export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-semibold text-brand-700 mb-3">ThreadMerge</h1>
        <p className="text-lg text-gray-600 mb-8">
          Merge email threads with controlled disclosure. Audit-ready by design.
        </p>
        <p className="text-sm text-gray-500">
          Stage 7 will build out the full dashboard: templates, audit log, settings.
        </p>
        <p className="text-sm text-gray-400 mt-8">
          Dashboard is currently a scaffolded placeholder. Connect via the add-in for now.
        </p>
      </div>
    </main>
  );
}
