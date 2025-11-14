import { motion } from "motion/react";
import { useEffect } from "react";

interface StudySessionPageProps {
  onNavigate: (page: string) => void;
}

export function StudySessionPage({ onNavigate }: StudySessionPageProps) {
  const flaskUrl = import.meta.env.VITE_FLASK_URL || 'http://localhost:5000';

  useEffect(() => {
    // Store the return URL in localStorage for Flask to use
    localStorage.setItem('returnToReact', 'true');
    localStorage.setItem('reactUrl', window.location.origin);
    
    // Redirect to Flask app directly (no iframe)
    window.location.href = flaskUrl;
  }, [flaskUrl]);

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
