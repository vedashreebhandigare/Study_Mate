import { motion } from "motion/react";
import { ReactNode } from "react";

interface GlassButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function GlassButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled = false,
}: GlassButtonProps) {
  const baseStyles = "relative overflow-hidden rounded-full transition-all duration-300";
  
  const variantStyles = {
    primary: "glass-panel-strong text-white shadow-lg shadow-purple-500/20",
    secondary: "glass-panel text-white/90",
    ghost: "bg-transparent text-white/80 hover:bg-white/5",
  };
  
  const sizeStyles = {
    sm: "px-6 py-2 text-sm",
    md: "px-8 py-3",
    lg: "px-12 py-4 text-lg",
  };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
    >
      {/* Spotlight effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%)",
        }}
      />
      
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.6 }}
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
        }}
      />
      
      {/* Glow border */}
      {variant === "primary" && (
        <motion.div
          className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            boxShadow: "0 0 20px rgba(124, 58, 237, 0.5), inset 0 0 20px rgba(124, 58, 237, 0.2)",
          }}
        />
      )}
      
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
