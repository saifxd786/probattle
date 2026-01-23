import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type StrengthLevel = "weak" | "medium" | "strong";

function computeStrength(password: string): { level: StrengthLevel; percent: number } {
  const p = password ?? "";
  if (!p) return { level: "weak", percent: 0 };

  let score = 0;
  if (p.length >= 6) score += 1;
  if (p.length >= 10) score += 1;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
  if (/\d/.test(p)) score += 1;
  if (/[^A-Za-z0-9]/.test(p)) score += 1;

  if (p.length < 6 || score <= 2) return { level: "weak", percent: 33 };
  if (score <= 4) return { level: "medium", percent: 66 };
  return { level: "strong", percent: 100 };
}

const levelToBadgeVariant: Record<StrengthLevel, React.ComponentProps<typeof Badge>["variant"]> = {
  weak: "destructive",
  medium: "secondary",
  strong: "default",
};

export default function PasswordStrengthMeter({
  password,
  className,
}: {
  password: string;
  className?: string;
}) {
  const { level, percent } = React.useMemo(() => computeStrength(password), [password]);
  const label = level === "weak" ? "Weak" : level === "medium" ? "Medium" : "Strong";

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength</span>
        <Badge variant={levelToBadgeVariant[level]}>{label}</Badge>
      </div>
      <Progress value={percent} className="h-2" />
      <p className="text-[10px] text-muted-foreground">
        Use 10+ characters, numbers, and symbols for a stronger password.
      </p>
    </div>
  );
}
