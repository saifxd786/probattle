import { motion } from 'framer-motion';
import { FileText, Shield, CreditCard, User, AlertTriangle, Scale, Mail } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const termsData = [
  {
    id: 'acceptance',
    icon: FileText,
    title: '1. Acceptance of Terms',
    content: `By accessing or using the ProBattle platform, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.

• These terms apply to all users, including players, viewers, and administrators.
• We reserve the right to modify these terms at any time without prior notice.
• Continued use of the platform constitutes acceptance of any modified terms.
• Users must be at least 13 years old to use this platform.`
  },
  {
    id: 'account',
    icon: User,
    title: '2. User Accounts',
    content: `Users are responsible for maintaining the confidentiality of their account credentials.

• One account per person. Multiple accounts are strictly prohibited.
• You are responsible for all activities that occur under your account.
• Account sharing is not allowed and may result in permanent ban.
• We reserve the right to suspend or terminate accounts that violate our policies.
• Fake or impersonation accounts will be immediately banned.`
  },
  {
    id: 'payments',
    icon: CreditCard,
    title: '3. Payments & Transactions',
    content: `All financial transactions on ProBattle are subject to the following terms:

• Deposits: Users can add funds to their wallet using approved payment methods.
• Withdrawals: Minimum withdrawal amount may apply. Processing time is 24-48 hours.
• Entry Fees: Non-refundable once a match starts unless cancelled by admin.
• Prize Money: Distributed within 24-48 hours after result verification.
• No Refunds: We do not offer refunds for completed transactions unless required by law.
• Fraudulent transactions will result in immediate account termination.`
  },
  {
    id: 'tournament',
    icon: Shield,
    title: '4. Tournament Participation',
    content: `By participating in tournaments, you agree to:

• Follow all game-specific rules and regulations.
• Abide by our Fair Play Policy at all times.
• Accept admin decisions as final and binding.
• Provide POV/Handcam recordings when requested.
• Not engage in cheating, hacking, or any form of unfair advantage.
• Maintain respectful behavior towards other players and admins.`
  },
  {
    id: 'liability',
    icon: AlertTriangle,
    title: '5. Limitation of Liability',
    content: `ProBattle shall not be liable for:

• Technical issues, server downtime, or connectivity problems.
• Any losses incurred due to unauthorized access to your account.
• Third-party actions or content.
• Game-related issues beyond our control.
• Any indirect, incidental, or consequential damages.
• We provide the platform "as is" without warranties of any kind.`
  },
  {
    id: 'termination',
    icon: Scale,
    title: '6. Termination',
    content: `We may terminate or suspend your account without prior notice for:

• Violation of these Terms of Service.
• Fraudulent or illegal activities.
• Cheating or exploiting the platform.
• Abusive behavior towards other users or staff.
• Any activity deemed harmful to the platform or community.

Upon termination, you forfeit any pending prizes or wallet balance if caused by ToS violation.`
  },
  {
    id: 'disputes',
    icon: Scale,
    title: '7. Dispute Resolution',
    content: `In case of any disputes:

• Contact our support team first through Telegram.
• Provide all relevant evidence and documentation.
• Admin decisions on match-related disputes are final.
• Financial disputes must be raised within 7 days.
• We will investigate and respond within 48-72 hours.`
  },
  {
    id: 'privacy',
    icon: Shield,
    title: '8. Privacy & Data',
    content: `Your privacy is important to us:

• We collect only necessary information for platform operation.
• Your data is stored securely and never sold to third parties.
• We may use your email for important notifications.
• You can request account deletion at any time.
• By using our services, you consent to our data practices.`
  }
];

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">
                Last updated: December 2024
              </p>
            </div>
          </div>
        </motion.div>

        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 mb-6"
        >
          <p className="text-sm text-muted-foreground">
            Welcome to ProBattle. These Terms of Service govern your use of our platform and services. 
            Please read them carefully before using our services. By using ProBattle, you agree to these terms.
          </p>
        </motion.div>

        {/* Terms Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {termsData.map((term, index) => (
              <motion.div
                key={term.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <AccordionItem value={term.id} className="glass-card border-border/30">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <term.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-display font-medium text-sm">{term.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="pl-11 text-sm text-muted-foreground whitespace-pre-line">
                      {term.content}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6 mt-6 text-center"
        >
          <Mail className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="font-display font-bold mb-2">Questions?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            If you have any questions about these Terms of Service, please contact us.
          </p>
          <a 
            href="mailto:support@probattle.com"
            className="text-primary text-sm hover:underline"
          >
            support@probattle.com
          </a>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default TermsPage;
