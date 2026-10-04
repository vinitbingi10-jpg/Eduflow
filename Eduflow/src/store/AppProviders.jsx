import { ToastProvider } from "@/components/common/Toast.jsx";
import { TimetableProvider } from "@/store/TimetableContext.jsx";

/**
 * Single composition root for global providers.
 * Order matters: the timetable store raises toasts, so ToastProvider wraps it.
 */
export function AppProviders({ children }) {
  return (
    <ToastProvider>
      <TimetableProvider>{children}</TimetableProvider>
    </ToastProvider>
  );
}
