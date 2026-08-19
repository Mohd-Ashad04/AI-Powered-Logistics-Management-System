import React from 'react';

export function LogisticsNetwork({ className = '' }) {
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`} style={{ minHeight: '300px' }}>
      {/* Background Gradient / Glow */}
      <div 
        className="absolute inset-0 opacity-20" 
        style={{
          background: 'radial-gradient(circle at 50% 50%, var(--color-accent-primary) 0%, transparent 60%)',
          filter: 'blur(40px)'
        }}
      />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(var(--color-border-strong) 1px, transparent 1px), linear-gradient(90deg, var(--color-border-strong) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          perspective: '1000px',
          transform: 'rotateX(60deg) scale(2)',
          transformOrigin: 'bottom'
        }}
      />

      {/* SVG Network */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-info-base)" stopOpacity="0.2" />
          </linearGradient>
          
          <linearGradient id="line-gradient-reverse" x1="100%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--color-success-base)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity="0.2" />
          </linearGradient>

          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Connections */}
        <path d="M 20% 30% Q 40% 10% 60% 40% T 80% 60%" fill="none" stroke="url(#line-gradient)" strokeWidth="2" strokeDasharray="10 5" className="network-path-1" />
        <path d="M 10% 70% Q 30% 90% 50% 50% T 90% 30%" fill="none" stroke="url(#line-gradient-reverse)" strokeWidth="1.5" strokeDasharray="8 6" className="network-path-2" />
        <path d="M 30% 20% L 50% 50% L 70% 80%" fill="none" stroke="var(--color-border-strong)" strokeWidth="1" />
        <path d="M 20% 30% L 10% 70%" fill="none" stroke="var(--color-border-strong)" strokeWidth="1" />
        <path d="M 60% 40% L 90% 30%" fill="none" stroke="var(--color-border-strong)" strokeWidth="1" />

        {/* Nodes */}
        <circle cx="20%" cy="30%" r="6" fill="var(--color-accent-primary)" filter="url(#glow)" className="animate-pulse" />
        <circle cx="60%" cy="40%" r="8" fill="var(--color-info-base)" filter="url(#glow)" className="animate-pulse" style={{ animationDelay: '1s' }} />
        <circle cx="80%" cy="60%" r="5" fill="var(--color-accent-primary)" />
        <circle cx="10%" cy="70%" r="4" fill="var(--color-success-base)" />
        <circle cx="50%" cy="50%" r="10" fill="var(--color-surface-elevated)" stroke="var(--color-accent-primary)" strokeWidth="2" />
        <circle cx="90%" cy="30%" r="6" fill="var(--color-success-base)" filter="url(#glow)" className="animate-pulse" style={{ animationDelay: '0.5s' }} />
        
        {/* Active Packets */}
        <circle r="3" fill="#fff" filter="url(#glow)">
          <animateMotion dur="4s" repeatCount="indefinite" path="M 20% 30% Q 40% 10% 60% 40% T 80% 60%" />
        </circle>
        
        <circle r="3" fill="#fff" filter="url(#glow)">
          <animateMotion dur="5s" repeatCount="indefinite" path="M 10% 70% Q 30% 90% 50% 50% T 90% 30%" />
        </circle>
      </svg>
      
      <style>{`
        .network-path-1 { stroke-dashoffset: 100; animation: dash 20s linear infinite; }
        .network-path-2 { stroke-dashoffset: 100; animation: dash 15s linear infinite reverse; }
        @keyframes dash { to { stroke-dashoffset: 0; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(1.1); } }
      `}</style>
    </div>
  );
}
