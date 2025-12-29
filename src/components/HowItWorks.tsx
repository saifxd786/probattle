import { motion } from 'framer-motion';
import { UserPlus, Shield, Trophy } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    title: 'Register & Join',
    description: 'Create your account and join matches that fit your skill level',
  },
  {
    icon: Shield,
    title: 'Play Fair',
    description: 'Compete with fair play rules and anti-cheat measures',
  },
  {
    icon: Trophy,
    title: 'Win Rewards',
    description: 'Earn real rewards and climb the leaderboard',
  },
];

const HowItWorks = () => {
  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-2">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-muted-foreground text-sm">
            Three simple steps to start competing
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative"
            >
              <div className="glass-card p-6 text-center h-full">
                {/* Step number */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-display font-bold">
                    {index + 1}
                  </span>
                </div>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 mb-4 mt-2">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>

                {/* Content */}
                <h3 className="font-display text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Connector line (hidden on last item) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-primary/30" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
