import { LucideIcon, LucideProps } from 'lucide-react';
import { ComponentProps } from 'react';
import { Link } from '@inertiajs/react';

// ============================================================================
// CORE ENTITIES
// ============================================================================

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Auth {
  user: User;
}

export interface Athlete {
  id: number;
  name: string;
  training_days?: string[];
  [key: string]: unknown;
}

// ============================================================================
// NAVIGATION & UI
// ============================================================================

export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon | null;
  isActive?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface BreadcrumbItem {
  title: string;
  href: string;
}

export interface SharedData {
  name: string;
  quote: { message: string; author: string };
  auth: Auth;
  sidebarOpen: boolean;
  csrf_token: string;
  [key: string]: unknown;
}

// ============================================================================
// EXERCISE & TRAINING TYPES
// ============================================================================

export interface Exercise {
  id?: number;
  value: string;
  displayName: string;
  name?: string;
  category?: string;
  difficulty?: string;
}

export interface PlannedExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number;
  exercise?: Exercise;
}

export interface TrainingSet {
  id: number;
  reps: number;
  weight: number;
  completed?: boolean;
  actual_reps?: number;
  actual_weight?: number;
  perceived_exertion?: number;
  notes?: string;
  completed_at?: string;
}

export interface Training {
  id: number;
  scheduled_at: string;
  completed_at?: string;
  athlete_id: number;
  training_plan_id: number;
  training_phase_id: number;
  feedback?: string;
  exercises?: PlannedExercise[];
  status?: string;
  notes?: string;
}

export interface TrainingPhase {
  id: number;
  name: string;
  duration_weeks: number;
  weeks?: number;
}

export interface TrainingPlan {
  id: number;
  name: string;
  description: string;
  phases: TrainingPhase[];
  duration_weeks: number;
}

// ============================================================================
// RECOVERY & PERFORMANCE
// ============================================================================

export interface RecoveryExercise {
  name: string;
  displayName?(): string;
}

export interface OneRepMax {
  exercise: Exercise;
  current: number;
  previous: number;
  change: number;
  hasImproved(): boolean;
  hasDeclined(): boolean;
  isStable(): boolean;
}

export interface OneRepMaxes {
  oneRepMaxes: OneRepMax[];
  count: number;
  isEmpty: boolean;
  isNotEmpty: boolean;
  improved: OneRepMax[];
  declined: OneRepMax[];
  stable: OneRepMax[];
}

// ============================================================================
// DASHBOARD & METRICS
// ============================================================================

export interface DashboardMetrics {
  totalWorkouts: number;
  currentStreak: number;
  completedThisWeek: number;
  weeklyGoal: number;
  phaseProgress: number;
  currentPhaseName: string;
  currentPhaseWeek: number;
  totalPhaseWeeks: number;
  lastWorkoutDate: string | null;
  nextWorkoutDate: string | null;
}

export interface ProgressMetrics {
  completedThisWeek: number;
  weeklyGoal: number;
  phaseWeek: number;
  totalPhaseWeeks: number;
  phaseProgressPercentage(): number;
}

export interface WeightProgression {
  exercise: {
    value: string;
    displayName: string;
    category: string;
    difficulty: string;
  };
  currentWeight: number | null;
  expectedWeight: number | null;
  startingWeight: number | null;
  startDate: string | null;
  endDate: string | null;
  dataPoints: {
    week: number;
    expected_weight: number;
    current_weight: number;
  }[];
  chartData: {
    series: {
      name: string;
      data: number;
      color: string;
    }[];
    categories: string[];
  };
  progressPercentage: number;
  isAhead: boolean;
  isBehind: boolean;
  isOnTrack: boolean;
}

export interface WeightProgressions {
  progressions: WeightProgression[];
}

// ============================================================================
// ONBOARDING TYPES
// ============================================================================

export interface ExperienceLevel {
  value: string;
  label: string;
  description: string;
}

export interface TrainingGoal {
  value: string;
  label: string;
  description: string;
}

export interface MuscleGroup {
  value: string;
  label: string;
}

export interface TrainingTime {
  value: string;
  label: string;
  description: string;
}

export interface Difficulty {
  value: string;
  label: string;
  description: string;
}

export interface Weekday {
  value: string;
  label: string;
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export type ProfileData = {
  experience_level: string;
  training_goals: string[];
  focus_areas: string[];
  training_frequency: number;
};

export type PreferencesData = {
  difficulty: string;
  equipment_access: string[];
};

export type ScheduleData = {
  training_days: string[];
  preferred_time: string;
  session_duration: number;
};

export type StatsData = {
  height: number;
  weight: number;
  body_fat_percentage?: number;
};

export type PlanData = {
  selected_plan_id: number;
};

export type LoginData = {
  email: string;
  password: string;
  remember?: boolean;
};

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export interface PasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface ProfileUpdateData {
  name: string;
  email: string;
}

// ============================================================================
// CHAT TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  chunks?: PrismTextChunk[];
}

export interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  messages_count?: number;
}

export type PrismTextChunk = {
  text: string;
  type: 'text' | 'code';
  language?: string;
};

// ============================================================================
// UI COMPONENT TYPES
// ============================================================================

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  shortcut?: string[];
  action: () => void;
  category?: string;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description?: string;
}

export interface ActionSheetAction {
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface SearchFilter {
  label: string;
  value: string;
  count?: number;
}

export interface DragItem {
  id: string;
  [key: string]: unknown;
}

// ============================================================================
// THEME & APPEARANCE
// ============================================================================

export type Appearance = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark' | 'system';

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type SavedCallback = (data?: unknown) => void;

export type QueryParams = Record<string, string | number | boolean | undefined>;

export type LinkProps = ComponentProps<typeof Link>;

// ============================================================================
// PWA TYPES
// ============================================================================

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// ============================================================================
// COMPONENT PROP INTERFACES
// ============================================================================

export interface IconProps extends Omit<LucideProps, 'ref'> {
  name: string;
  size?: number;
}

export interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

// ============================================================================
// TRAINING SESSION STATE
// ============================================================================

export interface TrainingFeedback {
  overall_difficulty: number;
  energy_level: number;
  motivation: number;
  notes?: string;
}

export interface TrainingSessionState {
  currentExerciseIndex: number;
  currentSetIndex: number;
  isResting: boolean;
  restTimeRemaining: number;
  sessionStartTime?: Date;
}

export interface RestTimer {
  isActive: boolean;
  timeRemaining: number;
  duration: number;
}
