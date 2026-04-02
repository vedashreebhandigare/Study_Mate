import { motion } from "motion/react";
import { useEffect } from "react";

interface StudySessionPageProps {
  onNavigate: (page: string) => void;
  user: any;
}

export function StudySessionPage({ onNavigate, user }: StudySessionPageProps) {
  const flaskUrl = (import.meta.env.VITE_FLASK_URL || "").trim();

  useEffect(() => {
    let isCancelled = false;

    const goToDashboard = () => {
      if (isCancelled) return;
      onNavigate("dashboard");
      window.location.hash = "dashboard";
    };

    const redirectToStudySession = async () => {
      if (!flaskUrl) {
        goToDashboard();
        return;
      }

      let targetUrl: URL;
      try {
        targetUrl = new URL(flaskUrl);
      } catch {
        goToDashboard();
        return;
      }

      // Store the return URL in localStorage for Flask to use.
      localStorage.setItem("returnToReact", "true");
      localStorage.setItem("reactUrl", window.location.origin);

      // Quick reachability check. If Flask is down/unreachable, avoid browser error page.
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 2500);

      try {
        await fetch(targetUrl.toString(), {
          method: "GET",
          mode: "no-cors",
          signal: controller.signal,
        });

        if (!isCancelled) {
          // Pass the user's name to Flask to auto-fill the setup form
          const name = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
          if (name) {
            targetUrl.searchParams.set("name", name);
          }
          window.location.assign(targetUrl.toString());
        }
      } catch {
        goToDashboard();
      } finally {
        window.clearTimeout(timeout);
      }
    };

    redirectToStudySession();

    return () => {
      isCancelled = true;
    };
  }, [flaskUrl, onNavigate]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-violet-900 to-indigo-900"
    >
      <div className="text-center text-white">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"
        />
        <p className="text-xl font-medium">Redirecting to Study Session...</p>
      </div>
    </motion.div>
  );
}
