import { motion } from 'framer-motion';
import { MessageCircle, Mail, FileText, Shield, HelpCircle } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import TelegramFloat from '@/components/TelegramFloat';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const supportLinks = [
  {
    icon: MessageCircle,
    title: 'Telegram Support',
    description: 'Get instant help from our team',
    href: 'https://t.me/ProScimstournament',
    external: true,
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'support@proscims.com',
    href: 'mailto:support@proscims.com',
    external: true,
  },
];

const pages = [
  { icon: FileText, title: 'Match Rules', path: '/rules' },
  { icon: Shield, title: 'Fair Play Policy', path: '/fair-play' },
  { icon: FileText, title: 'Terms of Service', path: '/terms' },
  { icon: HelpCircle, title: 'FAQs', path: '/faqs' },
];

const SupportPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold">Support</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Get help and find information
          </p>
        </motion.div>

        {/* Contact Options */}
        <div className="space-y-4 mb-8">
          {supportLinks.map((item, index) => (
            <motion.a
              key={item.title}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4 flex items-center gap-4 hover:border-primary/40 transition-all duration-300 block"
            >
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-sm font-bold">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <Button variant="outline" size="sm">
                Open
              </Button>
            </motion.a>
          ))}
        </div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-display text-lg font-bold mb-4">Quick Links</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {pages.map((page, index) => (
              <motion.div
                key={page.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Link 
                  to={page.path}
                  className="glass-card p-4 flex flex-col items-center text-center hover:border-primary/40 transition-all duration-300 block h-full"
                >
                  <page.icon className="w-6 h-6 text-primary mb-2" />
                  <span className="text-xs font-medium">{page.title}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      <BottomNav />
      <TelegramFloat />
    </div>
  );
};

export default SupportPage;
