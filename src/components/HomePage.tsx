import { motion } from "motion/react";
import { GlassButton } from "./GlassButton";
import { Brain, Sparkles, FileText, MessageSquare, Zap, Shield, Globe } from "lucide-react";

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Learning",
      description: "Advanced AI algorithms personalize your learning journey",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: FileText,
      title: "Smart Documents",
      description: "Upload and analyze documents with AI assistance",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Sparkles,
      title: "Interactive Quizzes",
      description: "Dynamic quizzes that adapt to your knowledge level",
      gradient: "from-violet-500 to-purple-500",
    },
    {
      icon: MessageSquare,
      title: "AI Tutor Chat",
      description: "24/7 AI tutor ready to answer your questions",
      gradient: "from-cyan-500 to-blue-500",
    },
  ];

  const benefits = [
    { icon: Zap, text: "Lightning Fast" },
    { icon: Shield, text: "Secure & Private" },
    { icon: Globe, text: "Access Anywhere" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(147, 51, 234, 0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(147, 51, 234, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Floating Particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mb-8"
          >
            <motion.div
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass-panel mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white/80">Powered by Advanced AI</span>
            </motion.div>
          </motion.div>

          <motion.h1
            className="text-7xl md:text-8xl lg:text-9xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-200 to-blue-200 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Learn Smarter,
            <br />
            Not Harder
          </motion.h1>

          <motion.p
            className="text-xl md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Transform your learning experience with AI-powered tools that adapt to your unique style and pace
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <GlassButton
              variant="primary"
              size="lg"
              onClick={() => onNavigate("auth")}
            >
              Get Started Free
            </GlassButton>
            <GlassButton variant="secondary" size="lg">
              Watch Demo
            </GlassButton>
          </motion.div>

          {/* Benefits */}
          <motion.div
            className="flex items-center justify-center gap-8 mt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.text}
                className="flex items-center gap-2 text-white/60"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 + index * 0.1 }}
              >
                <benefit.icon className="w-5 h-5 text-purple-400" />
                <span>{benefit.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Dashboard Preview Mockup */}
          <motion.div
            className="mt-24 relative"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {/* Preview Label */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <p className="text-sm text-purple-400/80 tracking-wider uppercase mb-2">Platform Preview</p>
              <h3 className="text-2xl md:text-3xl text-white/80">Your Learning Hub</h3>
            </motion.div>

            <div className="relative max-w-5xl mx-auto">
              {/* Glow effect behind dashboard */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-cyan-500/20 blur-3xl -z-10" />
              
              {/* Dashboard Container */}
              <div className="glass-panel-strong rounded-3xl p-8 border border-white/10 shadow-2xl">
                {/* Mini Feature Cards Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {features.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      className="relative group"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 1.6 + index * 0.1 }}
                      whileHover={{ 
                        scale: 1.05,
                        rotateY: 5,
                      }}
                    >
                      <div className="glass-panel rounded-2xl p-6 h-full relative overflow-hidden">
                        {/* Gradient accent */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                        
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-3`}>
                          <feature.icon className="w-5 h-5 text-white" />
                        </div>
                        
                        {/* Title */}
                        <h4 className="text-sm text-white/90 mb-1">{feature.title}</h4>
                        
                        {/* Placeholder content lines */}
                        <div className="space-y-1.5 mt-3">
                          <div className="h-1.5 bg-white/10 rounded-full w-full" />
                          <div className="h-1.5 bg-white/10 rounded-full w-4/5" />
                          <div className="h-1.5 bg-white/10 rounded-full w-3/5" />
                        </div>

                        {/* Shimmer effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                          animate={{
                            x: ['-100%', '200%'],
                          }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            repeatDelay: 2,
                            delay: index * 0.3,
                          }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom indicator - shows this is interactive */}
                <motion.div
                  className="mt-6 flex items-center justify-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.2 }}
                >
                  <div className="h-1 w-8 rounded-full bg-purple-500/50" />
                  <div className="h-1 w-1 rounded-full bg-white/30" />
                  <div className="h-1 w-1 rounded-full bg-white/30" />
                  <div className="h-1 w-1 rounded-full bg-white/30" />
                </motion.div>
              </div>

              {/* 3D depth effect corners */}
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-2xl -z-20" />
              <div className="absolute -top-4 -left-4 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-2xl -z-20" />
            </div>
          </motion.div>
        </div>

        {/* Enhanced Floating Decorative Elements */}
        
        {/* Original purple gradient - top left */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #7C3AED 0%, transparent 70%)" }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />

        {/* Blue/Cyan gradient - top right */}
        <motion.div
          className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, #3B82F6 0%, #06B6D4 30%, transparent 70%)" }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        />

        {/* Pink gradient - bottom left */}
        <motion.div
          className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full blur-3xl opacity-15"
          style={{ background: "radial-gradient(circle, #EC4899 0%, #8B5CF6 40%, transparent 70%)" }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 9, repeat: Infinity, delay: 2 }}
        />

        {/* Small accent gradient - center right */}
        <motion.div
          className="absolute top-1/2 right-1/3 w-48 h-48 rounded-full blur-2xl opacity-10"
          style={{ background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)" }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.1, 0.2, 0.1],
            x: [0, 20, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 7, repeat: Infinity, delay: 1.5 }}
        />
      </section>

      {/* Features Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-5xl md:text-6xl mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Powerful Features
            </h2>
            <p className="text-xl text-white/50">
              Everything you need to accelerate your learning
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="group relative"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <motion.div
                  className="glass-panel rounded-3xl p-8 h-full relative overflow-hidden"
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Gradient background on hover */}
                  <motion.div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                  />

                  {/* Icon */}
                  <motion.div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 relative`}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <feature.icon className="w-7 h-7 text-white" />
                  </motion.div>

                  <h3 className="text-2xl mb-3 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-white/60">
                    {feature.description}
                  </p>

                  {/* Glow effect */}
                  <motion.div
                    className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-20 transition-opacity duration-500"
                    style={{ background: `radial-gradient(circle, ${feature.gradient.includes('purple') ? '#7C3AED' : '#3B82F6'} 0%, transparent 70%)` }}
                  />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className="glass-panel-strong rounded-[3rem] p-16 relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0 opacity-30"
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
              <h2 className="text-5xl md:text-6xl mb-6 text-white">
                Ready to Transform Your Learning?
              </h2>
              <p className="text-xl text-white/60 mb-10">
                Join thousands of students already learning smarter with AI
              </p>
              <GlassButton
                variant="primary"
                size="lg"
                onClick={() => onNavigate("auth")}
              >
                Start Learning Now
              </GlassButton>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
