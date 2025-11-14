import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { GlassButton } from "./GlassButton";
import { Mail, Lock, User, ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { signUp, signIn, signInWithGoogle, signInWithGithub } from "../lib/supabase";
import { toast } from "sonner@2.0.3";

interface AuthPageProps {
  onNavigate: (page: string) => void;
  onAuthSuccess: () => void;
}

export function AuthPage({ onNavigate, onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Sign in
        console.log("🔐 Attempting sign in for:", formData.email);
        const { data, error } = await signIn(formData.email, formData.password);
        
        console.log("📊 Sign in response:", { data, error });
        
        if (error) {
          console.error("❌ Sign in error:", error);
          
          // Provide more helpful error messages
          let userMessage = error.message;
          
          // Check for email confirmation error
          if (error.message.includes("Email not confirmed") || error.message.includes("email_not_confirmed")) {
            userMessage = "Please confirm your email address before signing in. Check your inbox for the confirmation link.";
          } else if (error.message.includes("Invalid login credentials")) {
            userMessage = "Invalid email or password. Please check your credentials and try again.";
          }
          
          setError(userMessage);
          toast.error("Sign in failed", {
            description: userMessage,
          });
        } else if (data.user) {
          console.log("✅ Sign in successful:", data.user.email);
          toast.success("Welcome back!", {
            description: "You've successfully signed in.",
          });
          onAuthSuccess();
        } else {
          console.warn("⚠️ Sign in returned no user and no error");
          setError("Sign in failed. Please try again.");
          toast.error("Sign in failed");
        }
      } else {
        // Sign up
        if (!formData.name) {
          setError("Please enter your full name");
          setIsLoading(false);
          return;
        }

        console.log("📝 Attempting sign up for:", formData.email);
        const { data, error } = await signUp(formData.email, formData.password, formData.name);
        
        console.log("📊 Sign up response:", { data, error });
        
        if (error) {
          console.error("❌ Sign up error:", error);
          setError(error.message);
          toast.error("Sign up failed", {
            description: error.message,
          });
        } else if (data.user) {
          console.log("✅ Sign up successful:", data.user.email);
          
          // Check if email confirmation is required
          if (data.user.identities && data.user.identities.length === 0) {
            // User exists but email not confirmed
            toast.info("Check your email", {
              description: "Please confirm your email address to complete registration.",
            });
            setError("Please check your email and confirm your address to continue.");
          } else if (!data.session) {
            // Session not created - email confirmation required
            toast.info("Check your email", {
              description: "We sent you a confirmation link. Please check your inbox.",
            });
            setError("Please confirm your email to complete sign up. Check your inbox for the confirmation link.");
          } else {
            // Sign up successful with immediate session
            toast.success("Account created!", {
              description: "Welcome to LearnAI! Let's get started.",
            });
            onAuthSuccess();
          }
        }
      }
    } catch (err) {
      setError("An unexpected error occurred");
      toast.error("Something went wrong", {
        description: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        setError(error.message);
        toast.error("Google sign in failed", {
          description: error.message,
        });
        setIsLoading(false);
      }
      // Don't set loading to false here - OAuth will redirect
    } catch (err) {
      setError("Failed to sign in with Google");
      toast.error("Something went wrong");
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await signInWithGithub();
      
      if (error) {
        setError(error.message);
        toast.error("GitHub sign in failed", {
          description: error.message,
        });
        setIsLoading(false);
      }
      // Don't set loading to false here - OAuth will redirect
    } catch (err) {
      setError("Failed to sign in with GitHub");
      toast.error("Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative">
      {/* Back button */}
      <motion.button
        onClick={() => onNavigate("home")}
        className="absolute top-8 left-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
        whileHover={{ x: -5 }}
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </motion.button>

      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Auth Card */}
        <motion.div
          className="glass-panel-strong rounded-3xl p-8 md:p-12 relative overflow-hidden"
          layout
        >
          {/* Animated gradient background */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                "radial-gradient(circle at 0% 0%, #7C3AED 0%, transparent 50%)",
                "radial-gradient(circle at 100% 100%, #3B82F6 0%, transparent 50%)",
                "radial-gradient(circle at 0% 0%, #7C3AED 0%, transparent 50%)",
              ],
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />

          <div className="relative z-10">
            {/* Logo */}
            <motion.div
              className="flex justify-center mb-8"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <span className="text-2xl">✨</span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h2
              className="text-3xl md:text-4xl text-center mb-2 text-white"
              layout
            >
              {isLogin ? "Welcome Back" : "Join LearnAI"}
            </motion.h2>
            <motion.p
              className="text-center text-white/60 mb-8"
              layout
            >
              {isLogin ? "Sign in to continue your learning journey" : "Start your AI-powered learning journey"}
            </motion.p>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}

            {/* Social Login Buttons */}
            <div className="space-y-3 mb-6">
              <motion.button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full glass-panel rounded-full px-6 py-3 flex items-center justify-center gap-3 text-white hover:bg-white/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!isLoading ? { scale: 1.02, boxShadow: "0 0 20px rgba(255,255,255,0.1)" } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Sign {isLogin ? "in" : "up"} with Google</span>
                  </>
                )}
              </motion.button>

              <motion.button
                onClick={handleGithubSignIn}
                disabled={isLoading}
                className="w-full bg-black/30 rounded-full px-6 py-3 flex items-center justify-center gap-3 text-white hover:bg-black/40 transition-all group border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={!isLoading ? { scale: 1.02, boxShadow: "0 0 20px rgba(255,255,255,0.1)" } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                    <span>Sign {isLogin ? "in" : "up"} with GitHub</span>
                  </>
                )}
              </motion.button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-transparent text-white/40 text-sm">OR</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="email"
                  placeholder="e.g. yourname@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="password"
                  placeholder="Your strong password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all"
                />
              </div>

              {isLogin && (
                <div className="flex justify-end">
                  <motion.button
                    type="button"
                    className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                    whileHover={{ x: 2 }}
                  >
                    Forgot password?
                  </motion.button>
                </div>
              )}

              <motion.div
                whileHover={!isLoading ? { scale: 1.02 } : {}}
                whileTap={!isLoading ? { scale: 0.98 } : {}}
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full px-6 py-3 text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                    {isLoading ? "Please wait..." : (isLogin ? "Sign in" : "Create Account")}
                  </span>
                </button>
              </motion.div>
            </form>

            {/* Toggle auth mode */}
            <motion.div
              className="mt-6 text-center"
              layout
            >
              <span className="text-white/60">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              </span>
              <motion.button
                onClick={() => setIsLogin(!isLogin)}
                className="text-purple-400 hover:text-purple-300 transition-colors"
                whileHover={{ x: 2 }}
              >
                {isLogin ? "Sign up →" : "Sign in →"}
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
