import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 0%, rgba(108, 63, 245, 0.12), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 20%, rgba(255, 155, 107, 0.14), transparent 50%), radial-gradient(ellipse 50% 30% at 70% 90%, rgba(232, 215, 84, 0.1), transparent 45%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8">
        <header className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="Harbor"
            width={28}
            height={20}
            unoptimized
          />
          <span className="font-montreal-semibold text-xl tracking-tight">
            Harbor
          </span>
        </header>

        <section className="flex flex-1 flex-col justify-center gap-8 py-16 md:max-w-xl">
          <div className="space-y-4">
            <h1 className="font-montreal-semibold text-4xl leading-[1.1] tracking-tight text-foreground md:text-5xl">
              Your team&apos;s harbor for projects that ship.
            </h1>
            <p className="max-w-md text-base text-muted-foreground md:text-lg">
              Create an organization, invite your crew, and keep every project
              in one place.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button asChild className="h-12 px-6">
              <Link href="/register">Get started</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 px-6">
              <Link href="/signin">Sign in</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
