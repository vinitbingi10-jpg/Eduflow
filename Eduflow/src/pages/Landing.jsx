import { useNavigate } from "react-router-dom";
import { ArrowRight, Hand, LayoutGrid, Lock, ScanSearch, Sparkles } from "lucide-react";
import { useTimetable } from "@/store/TimetableContext.jsx";
import { Wordmark } from "@/components/common/Logo.jsx";
import { Button } from "@/components/common/Button.jsx";

const POINTS = [
  { icon: Hand, title: "Manual", body: "Drag classes onto the grid, edit anything, lock what should stay." },
  { icon: Sparkles, title: "AI", body: "Add subjects, teachers and rooms and let the assistant fill the week." },
  { icon: ScanSearch, title: "Conflict check", body: "Teacher, room and division clashes show up the moment they happen." },
];

export default function Landing() {
  const navigate = useNavigate();
  const { openModal } = useTimetable();

  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-canvas text-ink-900 lg:overflow-hidden">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-4 px-5">
          <Wordmark size={28} />
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={LayoutGrid} onClick={() => navigate("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="dark" size="sm" onClick={() => navigate("/editor")}>
              Open editor
            </Button>
          </div>
        </div>
      </header>

      <main className="grid-paper flex flex-1 items-center">
        <div className="mx-auto w-full max-w-[1100px] px-5 py-10">
          <div className="max-w-2xl">
            <h1 className="font-display text-[2.4rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[3.2rem]">
              Smarter Scheduling for <span className="text-brand-600">Flexible Education</span>
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-600">
              Create, optimize and manage academic timetables with AI assistance while keeping complete manual control.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" variant="primary" iconRight={ArrowRight} onClick={() => navigate("/editor")}>
                Start Creating
              </Button>
              <Button
                size="lg"
                variant="secondary"
                icon={Sparkles}
                onClick={() => {
                  navigate("/editor");
                  setTimeout(() => openModal("generate"), 250);
                }}
              >
                Try AI Generator
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {POINTS.map((p) => (
              <div key={p.title} className="rounded-lg border border-ink-200 bg-white p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                  <p.icon className="h-4 w-4" strokeWidth={2.1} />
                </span>
                <h3 className="mt-2.5 text-[14px] font-semibold">{p.title}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{p.body}</p>
              </div>
            ))}
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-[12px] text-ink-400">
            <Lock className="h-3.5 w-3.5" strokeWidth={2.2} />
            Locked cells are never changed by the AI.
          </p>
        </div>
      </main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto flex h-11 max-w-[1100px] items-center px-5 text-[12px] text-ink-400">
          Eduflow
        </div>
      </footer>
    </div>
  );
}
