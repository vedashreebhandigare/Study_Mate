import { motion } from "motion/react";
import { LucideIcon, Lock } from "lucide-react";
import { ReactNode } from "react";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";

interface DashboardCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  onClick?: () => void;
  children?: ReactNode;
  delay?: number;
  disabled?: boolean;
}

export function DashboardCard({
  icon: Icon,
  title,
  description,
  gradient,
  onClick,
  children,
  delay = 0,
  disabled = false,
}: DashboardCardProps) {
  return (
    <motion.div
      className={`group relative ${disabled ? 'opacity-70' : ''}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: disabled ? 0.7 : 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      whileHover={disabled ? {} : { y: -8 }}
    >
      <motion.div
        className={`glass-panel rounded-3xl p-6 md:p-8 h-full relative overflow-hidden ${disabled ? 'cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
        onClick={disabled ? undefined : onClick}
        whileHover={disabled ? {} : { scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        {/* Gradient background on hover */}
        {!disabled && (
          <motion.div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
          />
        )}

        {/* Glow effect */}
        {!disabled && (
          <motion.div
            className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-3xl"
            style={{
              background: gradient.includes("purple")
                ? "radial-gradient(circle, #7C3AED 0%, transparent 70%)"
                : "radial-gradient(circle, #3B82F6 0%, transparent 70%)",
            }}
          />
        )}

        <div className="relative z-10">
          {/* Icon */}
          <motion.div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-6`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.3 }}
          >
            <Icon className="w-7 h-7 text-white" />
          </motion.div>

          {/* Content */}
          <h3 className="text-2xl mb-2 text-white">{title}</h3>
          <p className="text-white/60 mb-6">{description}</p>

          {children}
        </div>

        {/* Shimmer effect */}
        {!disabled && (
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.8 }}
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
            }}
          />
        )}

        {/* Lock indicator for disabled cards - Top right corner */}
        {disabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.div
                className="absolute top-4 right-4 z-20 cursor-help pointer-events-auto"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: delay + 0.2 }}
                whileHover={{ scale: 1.1 }}
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-500/30 flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <Lock className="w-5 h-5 text-orange-400" />
                </div>
              </motion.div>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="glass-panel-strong border-orange-500/30 text-white max-w-[200px]"
              sideOffset={8}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/30 to-red-500/30 flex items-center justify-center flex-shrink-0">
                  📄
                </div>
                <p className="text-xs">Upload a document first to unlock this feature</p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </motion.div>
    </motion.div>
  );
}
