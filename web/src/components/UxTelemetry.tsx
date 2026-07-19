import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { resolveEntryScreen, trackEntryScreen } from "../telemetry/ux";

export function UxTelemetry() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackEntryScreen(resolveEntryScreen(pathname));
  }, []);

  return null;
}
