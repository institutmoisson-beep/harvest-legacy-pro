import { Crown, Star, Shield, Trophy, Flame, Sword, Gem, Sparkles, Award, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CAREER_LEVELS = {
  novice: {
    label: "Moissonneur Novice",
    icon: Target,
    color: "bg-gray-500",
    gradient: "from-gray-400 to-gray-600",
  },
  actif: {
    label: "Moissonneur Actif",
    icon: Star,
    color: "bg-blue-500",
    gradient: "from-blue-400 to-blue-600",
  },
  zonal: {
    label: "Moissonneur Zonal",
    icon: Shield,
    color: "bg-green-500",
    gradient: "from-green-400 to-green-600",
  },
  principal: {
    label: "Moissonneur Principal",
    icon: Trophy,
    color: "bg-purple-500",
    gradient: "from-purple-400 to-purple-600",
  },
  gouverneur: {
    label: "Gouverneur Moissonneur",
    icon: Flame,
    color: "bg-orange-500",
    gradient: "from-orange-400 to-orange-600",
  },
  comte: {
    label: "Comte Moissonneur",
    icon: Award,
    color: "bg-pink-500",
    gradient: "from-pink-400 to-pink-600",
  },
  general: {
    label: "Général Moissonneur",
    icon: Sword,
    color: "bg-red-500",
    gradient: "from-red-400 to-red-600",
  },
  royal_8: {
    label: "Moissonneur Royal",
    icon: Crown,
    color: "bg-yellow-500",
    gradient: "from-yellow-400 to-yellow-600",
  },
  royal_9: {
    label: "Royal Moissonneur",
    icon: Gem,
    color: "bg-indigo-500",
    gradient: "from-indigo-400 to-indigo-600",
  },
  guide: {
    label: "Guide Moissonneur",
    icon: Sparkles,
    color: "bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600",
    gradient: "from-purple-500 via-pink-500 to-yellow-500",
  },
} as const;

type CareerLevel = keyof typeof CAREER_LEVELS;

interface CareerLevelBadgeProps {
  level: CareerLevel;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const CareerLevelBadge = ({ 
  level, 
  size = "md", 
  showLabel = true 
}: CareerLevelBadgeProps) => {
  const config = CAREER_LEVELS[level];
  const Icon = config.icon;

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <div className="flex items-center gap-3">
      <div 
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg animate-pulse`}
      >
        <Icon className="text-white" size={iconSizes[size]} />
      </div>
      {showLabel && (
        <div>
          <Badge className={`${config.color} text-white font-semibold`}>
            {config.label}
          </Badge>
        </div>
      )}
    </div>
  );
};

export { CAREER_LEVELS };
export type { CareerLevel };