import { useState, type ReactNode } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { UxTelemetry } from "./components/UxTelemetry";
import { AppShell } from "./layouts/AppShell";
import { HomeScreen } from "./screens/HomeScreen";
import { ImportScreen } from "./screens/ImportScreen";
import { ReviewScreen } from "./screens/ReviewScreen";
import { CandidatesScreen } from "./screens/CandidatesScreen";
import { CandidateDetailScreen } from "./screens/CandidateDetailScreen";
import { SearchScreen } from "./screens/SearchScreen";
import { JobsScreen } from "./screens/JobsScreen";
import { JobCreateScreen } from "./screens/JobCreateScreen";
import { JobReviewScreen } from "./screens/JobReviewScreen";
import { JobDetailScreen } from "./screens/JobDetailScreen";
import { SubmissionsScreen } from "./screens/SubmissionsScreen";
import { SubmissionDetailScreen } from "./screens/SubmissionDetailScreen";
import { OnboardingScreen, isOnboardingDone } from "./screens/OnboardingScreen";

function RequireOnboarding({ children }: { children: ReactNode }) {
  if (!isOnboardingDone()) {
    return <Navigate to="/onboarding" replace />;
  }
  return children;
}

export default function App() {
  return (
    <>
      <UxTelemetry />
      <Routes>
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route
          path="/review/:id"
          element={
            <RequireOnboarding>
              <ReviewScreen />
            </RequireOnboarding>
          }
        />
        <Route
          path="/jobs/:id/review"
          element={
            <RequireOnboarding>
              <JobReviewScreen />
            </RequireOnboarding>
          }
        />
        <Route
          element={
            <RequireOnboarding>
              <AppShell />
            </RequireOnboarding>
          }
        >
          <Route index element={<HomeScreen />} />
          <Route path="import" element={<ImportScreen />} />
          <Route path="candidates" element={<CandidatesScreen />} />
          <Route path="candidates/:id" element={<CandidateDetailScreen />} />
          <Route path="search" element={<SearchScreen />} />
          <Route path="jobs" element={<JobsScreen />} />
          <Route path="jobs/new" element={<JobCreateScreen />} />
          <Route path="jobs/:id" element={<JobDetailScreen />} />
          <Route path="pipeline" element={<SubmissionsScreen />} />
          <Route path="submissions/:id" element={<SubmissionDetailScreen />} />
        </Route>
      </Routes>
    </>
  );
}
