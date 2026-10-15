import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SPR — Ma'din School of Excellence" },
      { name: "description", content: "Student Performance Rating: a holistic, weighted view of every student's growth across seven categories." },
      { property: "og:title", content: "SPR — Ma'din School of Excellence" },
      { property: "og:description", content: "Holistic, weighted student performance ratings across seven categories." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <main className="bg-hero flex min-h-screen flex-col">
      <header className="flex items-center gap-3 px-6 py-5 md:px-12">
        <div className="flex size-10 items-center justify-center rounded-lg bg-gold text-gold-foreground">
          <GraduationCap className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-lg font-semibold">SPR</p>
          <p className="text-xs opacity-80">Ma'din School of Excellence</p>
        </div>
      </header>
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-16 md:px-12">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-gold">Student Performance Rating</p>
        <h1 className="text-4xl font-semibold leading-tight md:text-6xl">
          A complete picture of every student's growth.
        </h1>
        <p className="mt-6 max-w-2xl text-lg opacity-85">
          Seven categories, one transparent score. Islamic Studies carries 20% — the remaining six share 80% equally.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
            <Link to="/auth">Staff sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
