import React from 'react';
import {
  BarChart3,
  BookOpen,
  Bookmark,
  BookText,
  Brain,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  Ellipsis,
  Flame,
  Globe,
  GraduationCap,
  Heart,
  Home,
  Info,
  Layers,
  Lightbulb,
  LucideIcon,
  MessageCircle,
  Plus,
  RefreshCw,
  Rocket,
  Scale,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sprout,
  Star,
  Stethoscope,
  Target,
  Trophy,
  Users,
  X,
} from 'lucide-react';

export type AppIconName =
  | 'home'
  | 'search'
  | 'star'
  | 'heart'
  | 'book'
  | 'bookmark'
  | 'grammar'
  | 'bookText'
  | 'topics'
  | 'users'
  | 'filter'
  | 'settings'
  | 'chevronRight'
  | 'chevronLeft'
  | 'plus'
  | 'check'
  | 'x'
  | 'info'
  | 'alert'
  | 'stats'
  | 'clock'
  | 'moreHorizontal'
  | 'flame'
  | 'trophy'
  | 'refresh'
  | 'lightbulb'
  | 'message'
  | 'globe'
  | 'brain'
  | 'briefcase'
  | 'stethoscope'
  | 'scale'
  | 'smartphone'
  | 'rocket'
  | 'shield'
  | 'sprout'
  | 'target';

const ICON_MAP: Record<AppIconName, LucideIcon> = {
  home: Home,
  search: Search,
  star: Star,
  heart: Heart,
  book: BookOpen,
  bookmark: Bookmark,
  grammar: GraduationCap,
  bookText: BookText,
  topics: Layers,
  users: Users,
  filter: SlidersHorizontal,
  settings: Settings,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  plus: Plus,
  check: Check,
  x: X,
  info: Info,
  alert: CircleAlert,
  stats: BarChart3,
  clock: Clock,
  moreHorizontal: Ellipsis,
  flame: Flame,
  trophy: Trophy,
  refresh: RefreshCw,
  lightbulb: Lightbulb,
  message: MessageCircle,
  globe: Globe,
  brain: Brain,
  briefcase: BriefcaseBusiness,
  stethoscope: Stethoscope,
  scale: Scale,
  smartphone: Smartphone,
  rocket: Rocket,
  shield: Shield,
  sprout: Sprout,
  target: Target,
};

const joinClasses = (...values: Array<string | undefined | null | false>) =>
  values.filter(Boolean).join(' ');

type IconProps = {
  name: AppIconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
  label?: string;
};

export const Icon: React.FC<IconProps> = ({
  name,
  className,
  size = 20,
  strokeWidth = 1.8,
  filled = false,
  label,
}) => {
  const Component = ICON_MAP[name];
  const accessibilityProps = label
    ? ({ role: 'img', 'aria-label': label } as const)
    : ({ 'aria-hidden': true } as const);

  return (
    <Component
      {...accessibilityProps}
      size={size}
      strokeWidth={strokeWidth}
      className={joinClasses('app-icon shrink-0', filled && 'app-icon--filled', className)}
    />
  );
};

type IconBadgeProps = {
  name: AppIconName;
  className?: string;
  iconClassName?: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
};

export const IconBadge: React.FC<IconBadgeProps> = ({
  name,
  className,
  iconClassName,
  size = 20,
  strokeWidth = 1.8,
  label,
}) => (
  <span className={joinClasses('icon-badge', className)} aria-hidden={label ? undefined : true}>
    <Icon
      name={name}
      className={iconClassName}
      size={size}
      strokeWidth={strokeWidth}
      label={label}
    />
  </span>
);

export default Icon;
