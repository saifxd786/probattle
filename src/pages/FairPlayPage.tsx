import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Ban, Eye, Video, CheckCircle, XCircle } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';

const policies = [
  {
    icon: Shield,
    title: 'Fair Gameplay',
    description: 'All players must engage in fair and honest gameplay at all times.',
    rules: [
      'No use of third-party tools, scripts, or modifications',
      'No exploitation of game bugs or glitches',
      'No teaming with opponents in solo matches',
      'No stream sniping during tournaments'
    ]
  },
  {
    icon: Ban,
    title: 'Prohibited Actions',
    description: 'The following actions are strictly prohibited and will result in immediate action.',
    rules: [
      'Using hacks, aimbots, wallhacks, or any cheating software',
      'Account sharing or using multiple accounts',
      'Intentional lag abuse or network manipulation',
      'Boosting or match fixing'
    ]
  },
  {
    icon: Eye,
    title: 'POV Requirements',
    description: 'Point of View recording is mandatory for all competitive matches.',
    rules: [
      'POV recording must be enabled during the entire match',
      'Recording must be clear and unobstructed',
      'Must be submitted within 24 hours if requested',
      'Failure to provide POV results in disqualification'
    ]
  },
  {
    icon: Video,
    title: 'Handcam Requirements',
    description: 'Handcam may be required in suspicious situations.',
    rules: [
      'Admin may request handcam footage at any time',
      'Must clearly show device screen and hand movements',
      'Refusal to provide handcam results in prize cancellation',
      'Quality must be sufficient for review'
    ]
  }
];

const consequences = [
  { level: 'Warning', description: 'First minor offense', color: 'text-yellow-500' },
  { level: 'Match Ban', description: 'Repeated minor offenses', color: 'text-orange-500' },
  { level: 'Prize Cancellation', description: 'Major rule violations', color: 'text-red-400' },
  { level: 'Permanent Ban', description: 'Cheating or hacking', color: 'text-red-600' }
];

const FairPlayPage = () => {
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
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Fair Play Policy</h1>
              <p className="text-sm text-muted-foreground">
                Ensuring fair competition for all players
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
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-2">Important Notice</h3>
              <p className="text-sm text-muted-foreground">
                By participating in any tournament on ProScrims, you agree to abide by our Fair Play Policy. 
                Violations will result in penalties ranging from warnings to permanent bans. 
                All admin decisions are final and non-negotiable.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Policy Sections */}
        <div className="space-y-4 mb-8">
          {policies.map((policy, index) => (
            <motion.div
              key={policy.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                      <policy.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display font-bold text-lg mb-1">{policy.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{policy.description}</p>
                      <ul className="space-y-2">
                        {policy.rules.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Consequences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <h2 className="font-display text-xl font-bold mb-4">Violation Consequences</h2>
          <div className="grid grid-cols-2 gap-3">
            {consequences.map((item, index) => (
              <Card key={item.level} className="glass-card">
                <CardContent className="p-4 text-center">
                  <XCircle className={`w-8 h-8 mx-auto mb-2 ${item.color}`} />
                  <h4 className={`font-bold ${item.color}`}>{item.level}</h4>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6 text-center"
        >
          <h3 className="font-display font-bold mb-2">Report Violations</h3>
          <p className="text-sm text-muted-foreground mb-4">
            If you suspect any player of violating our Fair Play Policy, please report them immediately.
          </p>
          <a 
            href="https://t.me/ProScimstournament" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            Report on Telegram
          </a>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default FairPlayPage;
