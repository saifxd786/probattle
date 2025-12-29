import { motion } from 'framer-motion';
import { HelpCircle, Wallet, Gamepad2, Shield, Users, MessageCircle } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqCategories = [
  {
    category: 'Getting Started',
    icon: Gamepad2,
    faqs: [
      {
        question: 'How do I create an account?',
        answer: 'Click on the "Login" button and sign up using your email address. You will receive a verification link. Once verified, you can start participating in tournaments.'
      },
      {
        question: 'How do I join a tournament?',
        answer: 'Browse available matches on the home page or BGMI section. Click on a match to view details and click "Join Match". Make sure you have sufficient balance in your wallet for paid matches.'
      },
      {
        question: 'What games are supported?',
        answer: 'Currently, we support BGMI (Battlegrounds Mobile India) tournaments including TDM 1v1, 2v2, 4v4, and Classic 100-player matches. More games will be added soon!'
      },
      {
        question: 'Is there a minimum level requirement?',
        answer: 'Yes, some matches may have minimum level requirements to ensure fair competition. Check the match details before joining.'
      }
    ]
  },
  {
    category: 'Wallet & Payments',
    icon: Wallet,
    faqs: [
      {
        question: 'How do I add money to my wallet?',
        answer: 'Go to the Wallet section, click on "Deposit", enter the amount, and make payment via UPI. Upload the payment screenshot and enter your UTR/Transaction ID for verification.'
      },
      {
        question: 'How long does deposit verification take?',
        answer: 'Deposits are usually verified within 5-15 minutes during business hours. For faster processing, you can contact support with your UTR ID.'
      },
      {
        question: 'How do I withdraw my winnings?',
        answer: 'Go to Wallet > Withdraw, enter the amount and your UPI ID. Withdrawals are processed within 24-48 hours after verification.'
      },
      {
        question: 'What is the minimum withdrawal amount?',
        answer: 'The minimum withdrawal amount is ₹50. There may be processing fees for smaller amounts.'
      },
      {
        question: 'What if my deposit is not credited?',
        answer: 'Contact our support team on Telegram with your UTR ID and payment screenshot. We will resolve the issue within 24 hours.'
      }
    ]
  },
  {
    category: 'Matches & Gameplay',
    icon: Shield,
    faqs: [
      {
        question: 'Where do I get Room ID and Password?',
        answer: 'Room details are sent via notification before the match starts. Check the bell icon in the app header. Make sure you have notifications enabled.'
      },
      {
        question: 'What happens if I join late?',
        answer: 'Late entries are not allowed. Players must join before the deadline. If you miss the deadline, your entry fee will not be refunded.'
      },
      {
        question: 'How are prizes distributed?',
        answer: 'Prizes are automatically added to your wallet after the admin declares the results. This usually happens within 1-2 hours after match completion.'
      },
      {
        question: 'What if a match is cancelled?',
        answer: 'If a match is cancelled by admin, your entry fee will be automatically refunded to your wallet. You will receive a notification about the refund.'
      },
      {
        question: 'Can I cancel my registration?',
        answer: 'Registration can be cancelled before the match starts. Contact support for cancellation requests. Refunds are subject to our cancellation policy.'
      }
    ]
  },
  {
    category: 'Fair Play',
    icon: Users,
    faqs: [
      {
        question: 'What is POV and why is it required?',
        answer: 'POV (Point of View) is a screen recording of your gameplay. It may be requested by admins to verify fair play. Failure to provide POV when requested results in disqualification.'
      },
      {
        question: 'What if I suspect someone is cheating?',
        answer: 'Report the player to our admin team on Telegram with evidence (screenshots, recordings). We take all reports seriously and investigate thoroughly.'
      },
      {
        question: 'What are the consequences of cheating?',
        answer: 'Cheating results in immediate disqualification, prize cancellation, and permanent ban from the platform. All winnings will be forfeited.'
      },
      {
        question: 'Can I use emulators?',
        answer: 'No, emulators are not allowed. All matches must be played on mobile devices. Emulator users will be banned.'
      }
    ]
  },
  {
    category: 'Account & Support',
    icon: MessageCircle,
    faqs: [
      {
        question: 'How do I contact support?',
        answer: 'You can reach us on Telegram @ProScimstournament or email us at support@proscims.com. Response time is usually within a few hours.'
      },
      {
        question: 'Can I change my username?',
        answer: 'Yes, you can update your username in the Profile section. Note that your in-game name should match your registered name.'
      },
      {
        question: 'What if I forgot my password?',
        answer: 'Use the "Forgot Password" option on the login page. A password reset link will be sent to your registered email.'
      },
      {
        question: 'How do I delete my account?',
        answer: 'Contact support to request account deletion. Note that any remaining wallet balance should be withdrawn first.'
      }
    ]
  }
];

const FAQsPage = () => {
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
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">FAQs</h1>
              <p className="text-sm text-muted-foreground">
                Frequently Asked Questions
              </p>
            </div>
          </div>
        </motion.div>

        {/* FAQ Categories */}
        <div className="space-y-6">
          {faqCategories.map((category, catIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + catIndex * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <category.icon className="w-5 h-5 text-primary" />
                <h2 className="font-display font-bold text-lg">{category.category}</h2>
              </div>
              
              <Accordion type="single" collapsible className="space-y-2">
                {category.faqs.map((faq, faqIndex) => (
                  <AccordionItem 
                    key={faqIndex} 
                    value={`${category.category}-${faqIndex}`}
                    className="glass-card border-border/30"
                  >
                    <AccordionTrigger className="px-4 hover:no-underline text-left">
                      <span className="font-medium text-sm">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>

        {/* Still Have Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-6 mt-8 text-center"
        >
          <HelpCircle className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-display font-bold text-lg mb-2">Still have questions?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Can't find the answer you're looking for? Contact our support team.
          </p>
          <a 
            href="https://t.me/ProScimstournament" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Contact Support
          </a>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default FAQsPage;
