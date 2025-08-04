import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            {/* Base platform */}
            <rect x="50" y="350" width="300" height="25" fill="currentColor" />
            
            {/* Left column base */}
            <rect x="75" y="320" width="50" height="30" fill="currentColor" />
            {/* Left column shaft */}
            <rect x="90" y="120" width="20" height="200" fill="currentColor" />
            {/* Left column capital */}
            <ellipse cx="100" cy="120" rx="30" ry="15" fill="currentColor" />
            <rect x="70" y="105" width="60" height="15" fill="currentColor" />
            
            {/* Right column base */}
            <rect x="275" y="320" width="50" height="30" fill="currentColor" />
            {/* Right column shaft */}
            <rect x="290" y="120" width="20" height="200" fill="currentColor" />
            {/* Right column capital */}
            <ellipse cx="300" cy="120" rx="30" ry="15" fill="currentColor" />
            <rect x="270" y="105" width="60" height="15" fill="currentColor" />
            
            {/* Left dumbbell */}
            <rect x="60" y="340" width="80" height="8" fill="currentColor" />
            <rect x="55" y="335" width="10" height="18" fill="currentColor" />
            <rect x="135" y="335" width="10" height="18" fill="currentColor" />
            
            {/* Right dumbbell */}
            <rect x="260" y="340" width="80" height="8" fill="currentColor" />
            <rect x="255" y="335" width="10" height="18" fill="currentColor" />
            <rect x="335" y="335" width="10" height="18" fill="currentColor" />
            
            {/* Figure - torso */}
            <ellipse cx="200" cy="200" rx="45" ry="60" fill="#D4B896" />
            
            {/* Figure - head */}
            <circle cx="200" cy="130" r="25" fill="#D4B896" />
            <path d="M185 125 Q200 115 215 125 Q210 135 200 138 Q190 135 185 125" fill="currentColor" />
            
            {/* Figure - arms */}
            <ellipse cx="150" cy="180" rx="15" ry="35" fill="#D4B896" transform="rotate(-20 150 180)" />
            <ellipse cx="250" cy="180" rx="15" ry="35" fill="#D4B896" transform="rotate(20 250 180)" />
            
            {/* Figure - forearms holding columns */}
            <ellipse cx="125" cy="160" rx="12" ry="25" fill="#D4B896" transform="rotate(-45 125 160)" />
            <ellipse cx="275" cy="160" rx="12" ry="25" fill="#D4B896" transform="rotate(45 275 160)" />
            
            {/* Figure - legs */}
            <ellipse cx="180" cy="280" rx="18" ry="50" fill="#D4B896" />
            <ellipse cx="220" cy="280" rx="18" ry="50" fill="#D4B896" />
            
            {/* Figure - shorts */}
            <rect x="165" y="240" width="70" height="40" rx="5" fill="currentColor" />
            
            {/* Muscle definition */}
            <ellipse cx="190" cy="190" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
            <ellipse cx="210" cy="190" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
            <path d="M200 210 Q190 220 200 230 Q210 220 200 210" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6" />
            
            {/* Column details - left */}
            <circle cx="85" cy="130" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="115" cy="130" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <rect x="88" y="140" width="24" height="3" fill="currentColor" />
            <rect x="88" y="148" width="24" height="3" fill="currentColor" />
            
            {/* Column details - right */}
            <circle cx="285" cy="130" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="315" cy="130" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
            <rect x="288" y="140" width="24" height="3" fill="currentColor" />
            <rect x="288" y="148" width="24" height="3" fill="currentColor" />
        </svg>
    );
}
