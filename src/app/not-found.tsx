import Link from 'next/link';

export default function NotFound() {
  return (
    <html>
      <body className="bg-black text-white font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
          <div className="h-px w-10 bg-[#B8976A] mb-8" />
          <h1 className="font-serif text-6xl font-normal sm:text-8xl">404</h1>
          <p className="mt-4 text-sm text-white/50 tracking-wide">
            Cette page n&apos;existe pas. / This page does not exist.
          </p>
          <Link
            href="/fr"
            className="mt-10 inline-flex items-center justify-center border border-white/30 px-8 py-3 text-xs uppercase tracking-[0.3em] text-white transition-all duration-300 hover:bg-white hover:text-black"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </body>
    </html>
  );
}
