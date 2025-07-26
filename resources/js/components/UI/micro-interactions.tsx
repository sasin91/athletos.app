import * as React from "react"
import { cn } from "@/lib/utils"
import { Check, Heart, Star, ThumbsUp, Zap } from "lucide-react"

// Ripple effect for button clicks
export function useRipple() {
  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    
    const ripple = document.createElement('span')
    ripple.className = 'ripple'
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple-animation 0.6s linear;
      pointer-events: none;
      z-index: 10;
    `
    
    // Add animation keyframes if not already added
    if (!document.querySelector('#ripple-styles')) {
      const style = document.createElement('style')
      style.id = 'ripple-styles'
      style.textContent = `
        @keyframes ripple-animation {
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }
    
    button.style.position = 'relative'
    button.style.overflow = 'hidden'
    button.appendChild(ripple)
    
    setTimeout(() => {
      ripple.remove()
    }, 600)
  }
  
  return createRipple
}

// Animated counter component
interface AnimatedCounterProps {
  value: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export function AnimatedCounter({ 
  value, 
  duration = 1000, 
  className, 
  prefix = '', 
  suffix = '' 
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [isAnimating, setIsAnimating] = React.useState(false)
  
  React.useEffect(() => {
    setIsAnimating(true)
    const startTime = Date.now()
    const startValue = displayValue
    const difference = value - startValue
    
    const updateCounter = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.round(startValue + difference * easeOut)
      
      setDisplayValue(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter)
      } else {
        setIsAnimating(false)
      }
    }
    
    requestAnimationFrame(updateCounter)
  }, [value, duration])
  
  return (
    <span className={cn("tabular-nums", isAnimating && "animate-pulse", className)}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}

// Morphing icon component
interface MorphingIconProps {
  icon1: React.ReactNode
  icon2: React.ReactNode
  isActive: boolean
  className?: string
  size?: number
}

export function MorphingIcon({ 
  icon1, 
  icon2, 
  isActive, 
  className, 
  size = 20 
}: MorphingIconProps) {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <div
        className={cn(
          "absolute transition-all duration-300 ease-in-out",
          isActive ? "scale-0 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"
        )}
        style={{ width: size, height: size }}
      >
        {icon1}
      </div>
      <div
        className={cn(
          "absolute transition-all duration-300 ease-in-out",
          isActive ? "scale-100 rotate-0 opacity-100" : "scale-0 -rotate-90 opacity-0"
        )}
        style={{ width: size, height: size }}
      >
        {icon2}
      </div>
    </div>
  )
}

// Floating hearts animation for likes
export function FloatingHearts({ trigger }: { trigger: boolean }) {
  const [hearts, setHearts] = React.useState<Array<{ id: number; x: number }>>([])
  
  React.useEffect(() => {
    if (trigger) {
      const newHearts = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100 - 50
      }))
      
      setHearts(prev => [...prev, ...newHearts])
      
      setTimeout(() => {
        setHearts(prev => prev.filter(heart => !newHearts.includes(heart)))
      }, 2000)
    }
  }, [trigger])
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map(heart => (
        <div
          key={heart.id}
          className="absolute bottom-0 left-1/2 animate-float-up"
          style={{
            transform: `translateX(${heart.x}px)`,
            animationDuration: '2s',
            animationTimingFunction: 'ease-out'
          }}
        >
          <Heart className="w-4 h-4 text-red-500 fill-current" />
        </div>
      ))}
      
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(0);
            opacity: 0;
          }
        }
        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

// Pulse animation for notifications
interface PulseProps {
  children: React.ReactNode
  isActive: boolean
  color?: string
  className?: string
}

export function Pulse({ children, isActive, color = "bg-blue-500", className }: PulseProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isActive && (
        <>
          <div className={cn("absolute inset-0 rounded-full animate-ping", color, "opacity-75")} />
          <div className={cn("absolute inset-0 rounded-full animate-pulse", color, "opacity-50")} />
        </>
      )}
    </div>
  )
}

// Shake animation for errors
export function useShake() {
  const [isShaking, setIsShaking] = React.useState(false)
  
  const trigger = React.useCallback(() => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }, [])
  
  return [isShaking, trigger] as const
}

interface ShakeProps {
  children: React.ReactNode
  trigger: boolean
  className?: string
}

export function Shake({ children, trigger, className }: ShakeProps) {
  return (
    <div className={cn(trigger && "animate-shake", className)}>
      {children}
      
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}

// Bounce animation for success states
interface BounceProps {
  children: React.ReactNode
  trigger: boolean
  className?: string
}

export function Bounce({ children, trigger, className }: BounceProps) {
  return (
    <div className={cn(trigger && "animate-bounce-once", className)}>
      {children}
      
      <style jsx>{`
        @keyframes bounce-once {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-in-out;
        }
      `}</style>
    </div>
  )
}

// Loading spinner with smooth animation
interface SpinnerProps {
  size?: number
  color?: string
  className?: string
}

export function Spinner({ size = 20, color = "currentColor", className }: SpinnerProps) {
  return (
    <div
      className={cn("animate-spin", className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12a9 9 0 11-6.219-8.56" />
      </svg>
    </div>
  )
}

// Progress circle with smooth animation
interface ProgressCircleProps {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  backgroundColor?: string
  className?: string
  showPercentage?: boolean
}

export function ProgressCircle({
  progress,
  size = 60,
  strokeWidth = 4,
  color = "currentColor",
  backgroundColor = "rgba(0,0,0,0.1)",
  className,
  showPercentage = false
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference
  
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium">
            <AnimatedCounter value={Math.round(progress)} suffix="%" />
          </span>
        </div>
      )}
    </div>
  )
}