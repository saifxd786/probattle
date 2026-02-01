import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Shield, Zap, Mail, MessageCircle, Server, Cpu, Database, Gamepad2, Trophy, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type TabType = 'status' | 'updates' | 'contact';

const MaintenancePage = () => {
  const [activeTab, setActiveTab] = useState<TabType>('status');

  const tabs = [
    { id: 'status' as TabType, label: 'Status', icon: Server },
    { id: 'updates' as TabType, label: 'Updates', icon: Zap },
    { id: 'contact' as TabType, label: 'Contact', icon: MessageCircle },
  ];

  return (
    <div className="h-[100dvh] bg-[#0A0A0F] relative overflow-hidden flex flex-col">
      {/* Animated Gaming Background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Diagonal lines pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(99, 102, 241, 0.5) 10px,
              rgba(99, 102, 241, 0.5) 11px
            )`
          }}
        />
        
        {/* Hex pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 17.32V52.68L30 70L0 52.68V17.32L30 0z' fill='none' stroke='%236366F1' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Animated gradient orbs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-32 -left-32 w-64 h-64 bg-gradient-to-br from-indigo-600/20 to-purple-600/10 rounded-full blur-[80px]"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-32 -right-32 w-80 h-80 bg-gradient-to-br from-purple-600/15 to-pink-600/10 rounded-full blur-[100px]"
        />
        
        {/* Floating game icons */}
        {[Gamepad2, Trophy, Swords].map((Icon, i) => (
          <motion.div
            key={i}
            className="absolute text-indigo-500/10"
            style={{
              left: `${20 + i * 30}%`,
              top: `${15 + i * 25}%`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 10, -10, 0],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 5 + i * 2,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          >
            <Icon className="w-16 h-16" />
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-6">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          {/* Animated Icon */}
          <div className="relative w-20 h-20 mx-auto mb-4">
            {/* Outer rotating ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  strokeDasharray="8 4"
                />
                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366F1" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
            
            {/* Inner pulsing circle */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30"
            >
              <Wrench className="w-7 h-7 text-white" />
            </motion.div>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
            Under Maintenance
          </h1>
          
          <div className="flex items-center justify-center gap-2">
            <motion.span 
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-2 h-2 bg-amber-500 rounded-full"
            />
            <span className="text-amber-500 text-sm font-medium">System Upgrade</span>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-1 mb-4"
        >
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'status' && (
              <motion.div
                key="status"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {/* System Status Cards */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-400" />
                    System Status
                  </h3>
                  
                  <div className="space-y-3">
                    {[
                      { icon: Cpu, label: 'Game Servers', status: 'Upgrading', color: 'amber' },
                      { icon: Database, label: 'Database', status: 'Online', color: 'green' },
                      { icon: Shield, label: 'Security', status: 'Active', color: 'green' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            item.color === 'green' ? 'bg-green-500/20' : 'bg-amber-500/20'
                          }`}>
                            <item.icon className={`w-4 h-4 ${
                              item.color === 'green' ? 'text-green-400' : 'text-amber-400'
                            }`} />
                          </div>
                          <span className="text-gray-300 text-sm">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <motion.span
                            animate={{ opacity: item.color === 'amber' ? [1, 0.5, 1] : 1 }}
                            transition={{ duration: 1, repeat: Infinity }}
                            className={`w-2 h-2 rounded-full ${
                              item.color === 'green' ? 'bg-green-500' : 'bg-amber-500'
                            }`}
                          />
                          <span className={`text-xs font-medium ${
                            item.color === 'green' ? 'text-green-400' : 'text-amber-400'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Data Safety */}
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">Your Data is Safe</p>
                      <p className="text-green-400/80 text-xs">All progress & wallet secured</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'updates' && (
              <motion.div
                key="updates"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    What's Coming
                  </h3>
                  
                  <div className="space-y-2">
                    {[
                      { text: 'Performance Improvements', desc: 'Faster loading & smoother gameplay' },
                      { text: 'New Game Features', desc: 'Exciting additions coming soon' },
                      { text: 'Bug Fixes', desc: 'Squashing known issues' },
                      { text: 'Security Enhancements', desc: 'Better protection for you' },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-xl"
                      >
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-indigo-400 text-xs font-bold">{i + 1}</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{item.text}</p>
                          <p className="text-gray-500 text-xs">{item.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Progress indicator */}
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs">Update Progress</span>
                    <span className="text-indigo-400 text-xs font-bold">75%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '75%' }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'contact' && (
              <motion.div
                key="contact"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-3">Need Help?</h3>
                  <p className="text-gray-400 text-xs mb-4">
                    Our support team is available 24/7 to assist you with any urgent matters.
                  </p>
                  
                  <div className="space-y-2">
                    <Button 
                      className="w-full bg-[#0088cc] hover:bg-[#0088cc]/90 text-white gap-2 h-12 rounded-xl"
                      onClick={() => window.open('https://t.me/probattle_support', '_blank')}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Contact on Telegram
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="w-full border-gray-700 hover:border-gray-600 gap-2 h-12 rounded-xl"
                      onClick={() => window.location.href = 'mailto:support@probattle.app'}
                    >
                      <Mail className="w-4 h-4" />
                      Send Email
                    </Button>
                  </div>
                </div>

                {/* Quick info */}
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4">
                  <p className="text-indigo-300 text-xs text-center">
                    💡 For fastest response, use Telegram
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-gray-600 text-[10px] mt-4"
        >
          © 2025 ProBattle Gaming. All rights reserved.
        </motion.p>
      </div>
    </div>
  );
};

export default MaintenancePage;
