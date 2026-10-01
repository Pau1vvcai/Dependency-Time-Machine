export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">
      <section className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Dependency Time Machine
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Upgrade your Next.js project.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Enter a public GitHub repository within the whitelist. The system will check the project, create a migration plan, and upgrade it to Next.js 16.
        </p>

        <form className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <label
            htmlFor="repository"
            className="block text-sm font-medium text-slate-200"
          >
            GitHub Repository URL
          </label>

          <input
            id="repository"
            name="repository"
            type="url"
            placeholder="https://github.com/owner/repository"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400"
          />

          <div className="mt-6">
            <p className="text-sm font-medium text-slate-200">Target Version</p>
            <p className="mt-2 rounded-lg border border-slate-700 bg-slate-950 px-4 py-3">
              Next.js 16
            </p>
          </div>

          <button
            type="button"
            disabled
            className="mt-6 w-full cursor-not-allowed rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 opacity-50"
          >
            Start Migration (Coming Soon)
          </button>

          <p className="mt-4 text-sm text-slate-400">
            Currently, only public TypeScript repositories within the whitelist are supported. The code will run in an isolated environment.
          </p>
        </form>
      </section>
    </main>
  );
}