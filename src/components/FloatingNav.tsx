import { motion } from "motion/react";
import { Home, BookOpen, Sparkles, User, LogOut } from "lucide-react";

interface FloatingNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  showDashboardItems?: boolean;
}

export function FloatingNav({ currentPage, onNavigate, showDashboardItems = false }: FloatingNavProps) {
  const homeItems = [
    { name: "Home", icon: Home, page: "home" },
    { name: "Features", icon: Sparkles, page: "home" },
    { name: "About", icon: BookOpen, page: "home" },
  ];

  const dashboardItems = [
    { name: "Dashboard", icon: Home, page: "dashboard" },
    { name: "Profile", icon: User, page: "profile" },
    { name: "Logout", icon: LogOut, page: "home" },
  ];

  const items = showDashboardItems ? dashboardItems : homeItems;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="glass-panel-strong rounded-full px-8 py-4 shadow-2xl shadow-purple-500/10">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white">LearnAI</span>
          </motion.div>

          {/* Nav items */}
          <div className="flex items-center gap-6">
            {items.map((item, index) => (
              <motion.button
                key={item.name}
                onClick={() => onNavigate(item.page)}
                className="relative px-4 py-2 text-white/70 hover:text-white transition-colors group"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </span>
                
                {/* Hover underline */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
                
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{
                    background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)",
                  }}
                />
              </motion.button>
            ))}
          </div>

          {/* CTA Button */}
          {!showDashboardItems && (
            <motion.button
              onClick={() => onNavigate("auth")}
              className="ml-4 px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300"
              whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(124,58,237,0.5)" }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Get Started
            </motion.button>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
