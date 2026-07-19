import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../api/client";
import { trackAbandon } from "../telemetry/ux";
import { useToast } from "../components/Toast";
import { ErrorState } from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

type Phase = "idle" | "uploading" | "done" | "error";

export function ImportScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const abandonTrackedRef = useRef(false);

  const recordAbandon = (reason: Parameters<typeof trackAbandon>[0]) => {
    if (abandonTrackedRef.current || phaseRef.current === "done") return;
    abandonTrackedRef.current = true;
    trackAbandon(reason);
  };

  useEffect(() => {
    const onBeforeUnload = () => {
      recordAbandon("import_close_tab");
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      recordAbandon("import_navigate_away");
    };
  }, []);

  const importMutation = useMutation({
    mutationFn: (file: File) => api.importResume(file),
    onMutate: () => {
      setPhase("uploading");
      setError(null);
    },
    onSuccess: (data) => {
      setPhase("done");
      toast("Resume imported");
      setTimeout(() => navigate(`/review/${data.candidateId}`), 600);
    },
    onError: (err: Error) => {
      setPhase("error");
      setError(err.message);
    },
  });

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "pdf" && ext !== "docx") {
        setPhase("error");
        setError("Only PDF and DOCX files are supported.");
        return;
      }
      importMutation.mutate(file);
    },
    [importMutation],
  );

  return (
    <div className="mx-auto max-w-lg flex-1 p-4 sm:p-8">
      <h1 className="mb-2 text-xl font-semibold">Import Resume</h1>
      <p className="mb-6 text-sm text-slate-500">
        Drop a PDF or DOCX. Processing usually takes a few seconds.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        className={`rounded-xl border-2 border-dashed px-6 py-16 text-center transition ${
          dragOver ? "border-slate-900 bg-slate-50" : "border-slate-300 bg-white"
        }`}
      >
        {phase === "uploading" ? (
          <div className="mx-auto max-w-xs space-y-2">
            <Skeleton className="mx-auto h-4 w-40" />
            <Skeleton className="mx-auto h-3 w-28" />
            <p className="pt-2 text-sm text-slate-600">Processing CV…</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-700">Drop PDF or DOCX here</p>
            <label className="mt-4 inline-block cursor-pointer text-sm font-medium text-slate-900 underline">
              Browse files
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </label>
          </>
        )}
      </div>

      {phase === "error" && error && (
        <div className="mt-4">
          <ErrorState
            message={error}
            onRetry={() => {
              setPhase("idle");
              setError(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
