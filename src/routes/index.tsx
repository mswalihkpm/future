import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Trophy,
  Medal,
  Award,
  Search,
  AlertCircle,
  Sparkles,
  Building2,
  BookOpen,
  Palette,
  Library,
  Sun,
  Moon,
  Users,
} from "lucide-react";
import { useTheme, useTripleClick } from "@/hooks/use-theme";
import { getPublicLeaderboardData } from "@/services/publicLeaderboard";
import { IssueReportingModal } from "@/components/public/IssueReportingModal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SPR — Student Performance Rating | Ma'din School of Excellence" },
      {
        name: "description",
        content:
          "Official Student Performance Rating (SPR) portal for Ma'din School of Excellence. Live master leaderboard, academic scoring, and student achievements.",
      },
      { property: "og:title", content: "SPR — Ma'din School of Excellence" },
      {
        property: "og:description",
        content:
          "Holistic, unlimited numerical student performance ratings across seven categories.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const skyTripleClick = useTripleClick(toggleTheme);

  const [search, setSearch] = useState("");
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedSchool, setSelectedSchool] = useState("ALL");
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-leaderboard"],
    queryFn: getPublicLeaderboardData,
    staleTime: 60_000,
  });

  const students = useMemo(() => data?.rankedStudents ?? [], [data?.rankedStudents]);
  const classes = data?.classes ?? [];
  const institutions = data?.institutions ?? [];

  // Top 3 Podium Students
  const top1 = students.find((s) => s.rank === 1);
  const top2 = students.find((s) => s.rank === 2);
  const top3 = students.find((s) => s.rank === 3);

  // Filtered leaderboard entries
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.sprId.toLowerCase().includes(q) ||
        (s.className ? s.className.toLowerCase().includes(q) : false);

      const matchesClass = selectedClass === "ALL" || s.className === selectedClass;
      const matchesSchool = selectedSchool === "ALL" || s.schoolName === selectedSchool;

      return matchesSearch && matchesClass && matchesSchool;
    });
  }, [students, search, selectedClass, selectedSchool]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      {/* Hero Sky Area with secret triple-click theme toggle */}
      <section
        onClick={skyTripleClick}
        title="Double/Triple-click anywhere in the sky header for secret theme toggle"
        className="relative overflow-hidden bg-gradient-to-b from-primary/15 via-primary/5 to-background border-b border-border/40 cursor-default select-none pt-6 pb-16 px-6 md:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <header className="flex items-center justify-between pb-10">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <GraduationCap className="size-6" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-bold tracking-tight">SPR</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase tracking-wider py-0 px-1.5 border-primary/30 text-primary"
                  >
                    Official Portal
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  Ma&apos;din School of Excellence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleTheme();
                }}
                className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Toggle Theme"
              >
                {isDark ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4" />}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setReportModalOpen(true);
                }}
                className="hidden sm:inline-flex gap-1.5 text-xs font-medium border-border/80"
              >
                <AlertCircle className="size-3.5 text-amber-500" />
                Report Inaccuracy
              </Button>

              <Button
                asChild
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm text-xs font-semibold px-4"
              >
                <Link to="/auth">Staff Sign In</Link>
              </Button>
            </div>
          </header>

          <div className="mx-auto max-w-3xl text-center pt-2 pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-4 border border-primary/20">
              <Sparkles className="size-3.5" />
              Academic &amp; Extracurricular Rating System
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground">
              Master Student Performance Leaderboard
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Authoritative, multi-dimensional rating across Islamic Studies, School Studies,
              Creative Hub, Classical Reading, Library Reading, and Literary Programmes.
            </p>
          </div>

          {/* Top 3 Podium Cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto items-end">
            {/* 2nd Place */}
            {top2 && (
              <div className="order-2 md:order-1 rounded-2xl border border-slate-300 dark:border-slate-800 bg-card/70 backdrop-blur-md p-6 text-center shadow-lg transition-all hover:scale-[1.02]">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Medal className="size-6" />
                </div>
                <Badge
                  variant="secondary"
                  className="mb-2 bg-slate-200 dark:bg-slate-800 text-xs font-bold"
                >
                  Rank #2 &bull; Silver
                </Badge>
                <h3 className="text-lg font-bold truncate text-foreground">{top2.fullName}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{top2.sprId}</p>
                <p className="text-xs text-muted-foreground mt-1">{top2.className}</p>
                <div className="mt-4 pt-3 border-t border-border/50">
                  <span className="text-2xl font-black text-slate-700 dark:text-slate-200">
                    {top2.earnedPoints.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground ml-1">pts</span>
                </div>
              </div>
            )}

            {/* 1st Place - Gold */}
            {top1 && (
              <div className="order-1 md:order-2 rounded-2xl border-2 border-amber-400/80 bg-gradient-to-b from-amber-500/10 via-card to-card p-7 text-center shadow-2xl shadow-amber-500/10 md:-translate-y-4 transition-all hover:scale-[1.02]">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                  <Trophy className="size-7" />
                </div>
                <Badge className="mb-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold uppercase tracking-wide">
                  Overall Champion &bull; Rank #1
                </Badge>
                <h3 className="text-xl font-extrabold truncate text-foreground">{top1.fullName}</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-mono font-semibold mt-0.5">
                  {top1.sprId}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{top1.className}</p>
                <div className="mt-4 pt-3 border-t border-amber-400/30">
                  <span className="text-3xl font-black text-amber-500">
                    {top1.earnedPoints.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground ml-1">pts</span>
                </div>
              </div>
            )}

            {/* 3rd Place - Bronze */}
            {top3 && (
              <div className="order-3 rounded-2xl border border-amber-700/20 bg-card/70 backdrop-blur-md p-6 text-center shadow-lg transition-all hover:scale-[1.02]">
                <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-amber-800/10 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  <Award className="size-6" />
                </div>
                <Badge
                  variant="outline"
                  className="mb-2 border-amber-700/40 text-amber-700 dark:text-amber-400 text-xs font-bold"
                >
                  Rank #3 &bull; Bronze
                </Badge>
                <h3 className="text-lg font-bold truncate text-foreground">{top3.fullName}</h3>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">{top3.sprId}</p>
                <p className="text-xs text-muted-foreground mt-1">{top3.className}</p>
                <div className="mt-4 pt-3 border-t border-border/50">
                  <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                    {top3.earnedPoints.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground ml-1">pts</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content: Search, Filters & Leaderboard Table */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 md:px-12 py-10">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by student name, SPR ID (e.g. SPR0001)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card border-border/70"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Class filter */}
            {classes.length > 0 && (
              <select
                aria-label="Filter by Class"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="h-9 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All Classes</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            {/* School filter */}
            {institutions.length > 0 && (
              <select
                aria-label="Filter by Institution"
                value={selectedSchool}
                onChange={(e) => setSelectedSchool(e.target.value)}
                className="h-9 rounded-md border border-input bg-card px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ALL">All Institutions</option>
                {institutions.map((inst) => (
                  <option key={inst} value={inst}>
                    {inst}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportModalOpen(true)}
              className="sm:hidden text-xs gap-1"
            >
              <AlertCircle className="size-3.5" />
              Report
            </Button>
          </div>
        </div>

        {/* Leaderboard Table Container */}
        <div className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border/60 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-4 py-3.5 w-16 text-center">
                    Rank
                  </th>
                  <th scope="col" className="px-4 py-3.5 w-28">
                    SPR ID
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Student Name
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Class &amp; Division
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    School
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Records
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-bold text-foreground">
                    Total Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      Loading authoritative ratings from Lovable Cloud Database...
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-muted-foreground">
                      No student records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => {
                    const isTop1 = s.rank === 1;
                    const isTop2 = s.rank === 2;
                    const isTop3 = s.rank === 3;

                    return (
                      <tr
                        key={s.studentId || s.sprId}
                        className={`transition-colors hover:bg-muted/30 ${
                          isTop1 ? "bg-amber-500/5 font-medium" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5 text-center">
                          {isTop1 ? (
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-500 text-white font-bold text-xs shadow-sm">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-800/30 text-amber-700 dark:text-amber-300 font-bold text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-mono text-xs">
                              {s.rank}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs font-semibold text-primary">
                          {s.sprId}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-foreground">{s.fullName}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{s.className}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground truncate max-w-[180px]">
                          {s.schoolName}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-right text-muted-foreground font-mono">
                          {s.recordCount}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-foreground tabular-nums text-base">
                          {s.earnedPoints.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Wings Summary Cards */}
        <section className="mt-14">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Evaluated Performance Wings
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Holistic student growth evaluated across seven foundational categories.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { title: "Islamic Studies", icon: BookOpen, desc: "Curricular stream" },
              { title: "School Studies", icon: GraduationCap, desc: "Kerala & NCERT" },
              { title: "Creative Hub", icon: Palette, desc: "Articles & Poems" },
              { title: "Library Reading", icon: Library, desc: "Books & Pages read" },
              { title: "Literary Fest", icon: Trophy, desc: "Competitions & prizes" },
              { title: "Qualifications", icon: Award, desc: "Hifz & specialized" },
            ].map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="rounded-xl border border-border/70 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="font-semibold text-xs text-foreground">{cat.title}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{cat.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-muted/20 py-8 px-6 text-center text-xs text-muted-foreground">
        <p>Student Performance Rating (SPR) &bull; Ma&apos;din School of Excellence</p>
        <p className="mt-1 opacity-70">
          Powered by Lovable Cloud Database &bull; Built with React, Vite &amp; TanStack
        </p>
      </footer>

      {/* Issue Reporting Modal */}
      <IssueReportingModal open={reportModalOpen} onOpenChange={setReportModalOpen} />
    </div>
  );
}
