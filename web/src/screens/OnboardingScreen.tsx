import { useNavigate } from "react-router-dom";

const KEY = "onboarding_done_v1";

export function isOnboardingDone(): boolean {
  return localStorage.getItem(KEY) === "1";
}

export function completeOnboarding() {
  localStorage.setItem(KEY, "1");
}

const STEPS = [
  {
    n: 1,
    title: "Import Resume",
    body: "Drop a PDF or DOCX. AI prepares the profile.",
  },
  {
    n: 2,
    title: "Review AI",
    body: "Approve, correct, or skip. You confirm the knowledge.",
  },
  {
    n: 3,
    title: "Create Job",
    body: "Paste a JD. Review parsed requirements. Save.",
  },
  {
    n: 4,
    title: "Submit",
    body: "Match ready candidates, submit, track to placement.",
  },
];

export function OnboardingScreen() {
  const navigate = useNavigate();

  const finish = () => {
    completeOnboarding();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Recruit Intelligence</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Get started in 4 steps</h1>
        <p className="mt-1 text-sm text-slate-500">Then use it like a normal workday tool.</p>

        <ol className="mt-8 space-y-4">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                {step.n}
              </span>
              <div>
                <p className="font-medium text-slate-900">{step.title}</p>
                <p className="text-sm text-slate-500">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={finish}
          className="mt-8 w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Done — open Inbox
        </button>
      </div>
    </div>
  );
}
