import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-4 px-6 py-10">
      <h1 className="text-4xl font-bold">Secure Auth Demo</h1>
      <p className="text-slate-600">
        NestJS JWT authentication with guarded routes and admin-managed users.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
      >
        Go to Login
      </Link>
    </main>
  );
}
