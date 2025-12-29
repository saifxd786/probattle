import { motion } from 'framer-motion';
import { Shield, Users, Zap, Award } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Fair Play Guaranteed',
    description: 'Strict anti-cheat and manual verification',
  },
  {
    icon: Zap,
    title: 'Instant Rewards',
    description: 'Quick payouts to your wallet',
  },
  {
    icon: Users,
    title: 'Active Community',
    description: '24/7 Telegram support available',
  },
  {
    icon: Award,
    title: 'Verified Results',
    description: 'Admin-verified match outcomes',
  },
];

const TrustSection = () => {
  return (
    <section className="py-12 px-4 bg-gradient-to-b from-transparent via-primary/5 to-transparent">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            Trust & <span className="text-gradient">Fair Play</span>
          </h2>
          <p className="text-muted-foreground text-sm">
            Your competitive gaming experience, secured
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-4 text-center hover:border-primary/30 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-3">
                <feature.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-display text-xs font-bold mb-1 tracking-wide">
                {feature.title}
              </h4>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
