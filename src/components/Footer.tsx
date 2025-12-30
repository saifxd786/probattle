import { Link } from 'react-router-dom';
import { FileText, Shield, HelpCircle, Scroll } from 'lucide-react';

const footerLinks = [
  { icon: Scroll, label: 'Rules', path: '/rules' },
  { icon: Shield, label: 'Fair Play', path: '/fair-play' },
  { icon: FileText, label: 'Terms', path: '/terms' },
  { icon: HelpCircle, label: 'FAQs', path: '/faqs' },
];

const Footer = () => {
  return (
    <footer className="py-6 px-4 border-t border-border/30 mb-16 md:mb-0">
      <div className="container mx-auto">
        {/* Quick Links */}
        <div className="flex flex-wrap justify-center gap-4 mb-4">
          {footerLinks.map((link) => (
            <Link 
              key={link.path}
              to={link.path} 
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <link.icon className="w-3 h-3" />
              {link.label}
            </Link>
          ))}
        </div>
        
        {/* Copyright */}
        <p className="text-xs text-muted-foreground/50 text-center">
          © {new Date().getFullYear()} ProScims Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;