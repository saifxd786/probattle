import { motion } from "framer-motion";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { 
  Shield, 
  Users, 
  Gamepad2, 
  Clock, 
  Scale, 
  Ban, 
  Video, 
  AlertTriangle,
  UserX,
  Settings,
  MessageSquareWarning,
  Radio,
  Trophy,
  XCircle,
  Lock,
  Wifi,
  Crown,
  CheckCircle,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const RulesPage = () => {
  const rulesSections = [
    {
      id: "general",
      icon: Shield,
      title: "General Rules",
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      rules: [
        "All matches are played on BGMI (official version only).",
        "Players must join using their registered in-game ID only.",
        "Any form of rule violation may result in disqualification or ban.",
        "Admin decisions are final and non-negotiable."
      ]
    },
    {
      id: "eligibility",
      icon: Users,
      title: "Eligibility",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      rules: [
        "Only registered users are allowed to participate.",
        "Multiple accounts are strictly prohibited.",
        "Players must meet the minimum level/requirements mentioned for the match.",
        "Fake, boosted, or shared accounts are not allowed."
      ]
    },
    {
      id: "match-types",
      icon: Gamepad2,
      title: "Match Types",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      rules: [
        "Supported match formats: TDM (1v1, 2v2, 4v4) and Classic (100 Players).",
        "Match format, map, and time will be announced before the match."
      ]
    },
    {
      id: "joining",
      icon: Clock,
      title: "Joining Rules",
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      rules: [
        "Players must join the room before the given deadline.",
        "Late entry is not allowed.",
        "Wrong slot joining may lead to disqualification without refund.",
        "Room ID & Password will be shared before match start."
      ]
    },
    {
      id: "fair-play",
      icon: Scale,
      title: "Fair Play Policy",
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/10",
      rules: [
        "Fair gameplay is mandatory.",
        "Use of any third-party tools, scripts, or unfair advantages is strictly prohibited.",
        "Any suspicious gameplay will be reviewed by admins."
      ]
    },
    {
      id: "anti-cheat",
      icon: Ban,
      title: "Anti-Cheat & Hacking Policy",
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      rules: [
        "If a player is reported or suspected of hacking or cheating:",
        "• POV (Point of View) recording is compulsory.",
        "• Handcam may be demanded by admin.",
        "Failure to provide POV/Handcam when asked will result in immediate disqualification, no prize eligibility, and possible account ban."
      ]
    },
    {
      id: "pov-handcam",
      icon: Video,
      title: "POV & Handcam Rules",
      color: "text-pink-400",
      bgColor: "bg-pink-500/10",
      rules: [
        "ANDROID: BGMI must be opened from the official Play Store. POV recording is compulsory when requested.",
        "iOS: BGMI must be downloaded from the official App Store. Screen recording POV is compulsory when requested.",
        "Handcam recording may be demanded in suspicious cases.",
        "If POV is not provided → direct disqualification."
      ]
    },
    {
      id: "no-pov",
      icon: AlertTriangle,
      title: "No POV / No Handcam",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10",
      rules: [
        "If a player fails to submit POV or Handcam:",
        "• Prize will be cancelled",
        "• Match result may be void",
        "• Account may be permanently banned"
      ]
    },
    {
      id: "team",
      icon: UserX,
      title: "Team Rules",
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/10",
      rules: [
        "Team changes after registration are not allowed.",
        "Playing with unregistered teammates is prohibited.",
        "Teaming with opponents in solo matches is strictly banned."
      ]
    },
    {
      id: "settings",
      icon: Settings,
      title: "Game Settings",
      color: "text-slate-400",
      bgColor: "bg-slate-500/10",
      rules: [
        "Graphics, sensitivity, and controls are player's choice.",
        "Exploiting game bugs or glitches is not allowed.",
        "Intentional lag abuse is prohibited."
      ]
    },
    {
      id: "misconduct",
      icon: MessageSquareWarning,
      title: "Misconduct",
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      rules: [
        "No abusive language, threats, or harassment.",
        "No spamming or disturbing admins or players.",
        "Toxic behavior may lead to instant removal."
      ]
    },
    {
      id: "streaming",
      icon: Radio,
      title: "Streaming & Recording",
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
      rules: [
        "Players may stream matches unless restricted.",
        "Stream sniping is strictly prohibited.",
        "Admin has the right to request match recordings anytime."
      ]
    },
    {
      id: "results",
      icon: Trophy,
      title: "Results & Prizes",
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      rules: [
        "Results declared by admin are final.",
        "Prize distribution will be done after verification.",
        "Any suspicious result may be put on hold for review."
      ]
    },
    {
      id: "disqualification",
      icon: XCircle,
      title: "Disqualification Conditions",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      rules: [
        "A player may be disqualified for:",
        "• Using hacks or cheats",
        "• Refusing POV or Handcam",
        "• Fake or multiple accounts",
        "• Abusive behavior",
        "• Rule violation of any kind"
      ]
    },
    {
      id: "ban",
      icon: Lock,
      title: "Account Ban Policy",
      color: "text-gray-400",
      bgColor: "bg-gray-500/10",
      rules: [
        "Serious violations may result in permanent ban.",
        "Banned users are not eligible for refunds or prizes.",
        "Ban decisions are final."
      ]
    },
    {
      id: "technical",
      icon: Wifi,
      title: "Technical Issues",
      color: "text-teal-400",
      bgColor: "bg-teal-500/10",
      rules: [
        "Internet, device, or game crash issues are player's responsibility.",
        "Match will not be restarted due to individual technical problems."
      ]
    },
    {
      id: "admin",
      icon: Crown,
      title: "Admin Rights",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      rules: [
        "Admin can modify rules if required.",
        "Admin decisions are final in all situations.",
        "No arguments or disputes will be entertained."
      ]
    },
    {
      id: "acceptance",
      icon: CheckCircle,
      title: "Acceptance of Rules",
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      rules: [
        "Joining a match means full acceptance of all rules.",
        "Claiming ignorance of rules is not acceptable."
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            BGMI Tournament Rules
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            These rules apply to all BGMI matches hosted on this platform. By registering or participating, all players agree to follow the rules strictly.
          </p>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-400">Important Notice</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Admin decisions are final and non-negotiable. Any form of rule violation may result in disqualification or permanent ban.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rules Accordion */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {rulesSections.map((section, index) => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.03 }}
              >
                <AccordionItem 
                  value={section.id} 
                  className="border border-border/50 rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${section.bgColor} flex items-center justify-center`}>
                        <section.icon className={`w-5 h-5 ${section.color}`} />
                      </div>
                      <span className="font-semibold text-foreground text-left">
                        {section.title}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <ul className="space-y-2 ml-13 pl-13">
                      {section.rules.map((rule, ruleIndex) => (
                        <li 
                          key={ruleIndex} 
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <ChevronRight className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>

        {/* Footer Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <CheckCircle className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">
                By participating, you accept all rules
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ignorance of rules is not an acceptable excuse
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default RulesPage;
