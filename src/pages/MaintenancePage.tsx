import { motion } from 'framer-motion';
import { Wrench, Clock, Mail, MessageCircle, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import probattleLogo from '@/assets/probattle-logo.jpg';

const MaintenancePage = () => {
  return (
    <div className="h-[100dvh] bg-[#0A0A0F] relative overflow-hidden flex items-center justify-center">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Glowing Orbs */}
      <motion.div 
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]"
      />
      <motion.div 
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-20 right-20 w-80 h-80 bg-purple-600/20 rounded-full blur-[120px]"
      />
      <motion.div 
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[150px]"
      />

      {/* Floating Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-primary/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Main Content */}
      <div className="relative z-10 max-w-lg mx-auto px-4 text-center py-4 max-h-full overflow-y-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4"
        >
          <img 
            src={probattleLogo} 
            alt="ProBattle" 
            className="w-20 h-20 mx-auto rounded-2xl shadow-2xl shadow-primary/20 border border-primary/20"
          />
        </motion.div>

        {/* Animated Gear Icon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative mb-4"
        >
          <div className="w-24 h-24 mx-auto relative">
            {/* Outer Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-4 border-dashed border-primary/30 rounded-full"
            />
            {/* Inner Ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute inset-4 border-2 border-primary/50 rounded-full"
            />
            {/* Center Icon */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Wrench className="w-6 h-6 text-white" />
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">
            Under Maintenance
          </h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-yellow-500 font-medium text-sm">System Upgrade in Progress</span>
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-muted-foreground mb-4 leading-relaxed text-sm"
        >
          We're making ProBattle even better! Our team is working hard to bring you 
          exciting new features. We'll be back shortly.
        </motion.p>

        {/* Status Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="grid grid-cols-2 gap-2 mb-4"
        >
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3">
            <Clock className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Estimated Time</p>
            <p className="text-xs font-bold text-white">~30 Minutes</p>
          </div>
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-3">
            <Shield className="w-4 h-4 text-green-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Your Data</p>
            <p className="text-xs font-bold text-white">100% Safe</p>
          </div>
        </motion.div>

        {/* What's Coming */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-gradient-to-r from-primary/10 via-purple-600/10 to-primary/10 border border-primary/20 rounded-xl p-3 mb-4"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-xs font-semibold text-white">What's Coming</span>
          </div>
          <div className="flex flex-wrap justify-center gap-1.5">
            {['Performance', 'New Features', 'Bug Fixes', 'Security'].map((item, i) => (
              <span 
                key={i}
                className="px-2 py-0.5 bg-background/50 rounded-full text-[10px] text-muted-foreground border border-border/50"
              >
                {item}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="space-y-2"
        >
          <p className="text-[10px] text-muted-foreground">Need urgent help?</p>
          <div className="flex items-center justify-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1.5 border-border/50 hover:border-primary/50 h-8 text-xs px-3"
              onClick={() => window.open('https://t.me/probattle_support', '_blank')}
            >
              <MessageCircle className="w-3 h-3" />
              Telegram
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1.5 border-border/50 hover:border-primary/50 h-8 text-xs px-3"
              onClick={() => window.location.href = 'mailto:support@probattle.app'}
            >
              <Mail className="w-3 h-3" />
              Email
            </Button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-4 text-[10px] text-muted-foreground/50"
        >
          © 2025 ProBattle. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
};

export default MaintenancePage;
