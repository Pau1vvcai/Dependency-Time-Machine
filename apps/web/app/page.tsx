import { CreateRunForm } from "@/components/create-run-form";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-20 text-slate-100">
      <section className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-cyan-400">
          Dependency Time Machine
        </p>

        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Upgrade your Next.js project safely
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Submit an allowlisted public GitHub repository. The system will
          inspect the project, create a migration plan, and upgrade it to
          Next.js 16.
        </p>

        <CreateRunForm />
      </section>
    </main>
  );
}