import React from 'react';
import { 
  Mail, 
  ArrowRight, 
  Linkedin, 
  Zap, 
  type LucideIcon 
} from 'lucide-react';

// --- UI Helper Components ---

/**
 * Updated Badge component to support 'href' (clickable) or standard span
 */
interface BadgeProps {
  children: React.ReactNode;
  color?: 'green' | 'blue' | 'zinc';
  pulse?: boolean;
  href?: string; // New prop added based on your snippet
}

const Badge: React.FC<BadgeProps> = ({ children, color = 'green', pulse, href }) => {
  const colorStyles = {
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
  };

  const baseClasses = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${colorStyles[color]} transition-opacity hover:opacity-80`;

  const Content = () => (
    <>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      )}
      {children}
    </>
  );

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        <Content />
      </a>
    );
  }

  return (
    <span className={baseClasses}>
      <Content />
    </span>
  );
};

/**
 * Mock BentoGrid Wrapper
 */
const BentoGrid: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 max-w-7xl mx-auto w-full ${className}`}>
      {children}
    </div>
  );
};

/**
 * Mock BentoCard Wrapper
 */
interface BentoCardProps {
  children: React.ReactNode;
  colSpan?: number;
  className?: string;
  noFade?: boolean;
}

const BentoCard: React.FC<BentoCardProps> = ({ children, colSpan = 1, className = "", noFade = false }) => {
  // Map colSpan number to Tailwind classes
  const colSpanClass = colSpan === 4 ? "md:col-span-4" : colSpan === 2 ? "md:col-span-2" : "md:col-span-1";
  
  return (
    <div className={`${colSpanClass} relative overflow-hidden rounded-3xl p-6 border shadow-sm ${className}`}>
      {children}
      {/* Visual fade effect unless disabled */}
      {!noFade && (
         <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent dark:from-black" />
      )}
    </div>
  );
};

// --- Main Component ---

const Connect: React.FC = () => {
  return (
    <section id="connect">
      {/* UX FIX: Reduced 'pb-24' to 'pb-12' to bring the footer closer to the call-to-action */}
      <BentoGrid className="pb-12">
        <BentoCard 
          colSpan={4} 
          noFade={true}
          className="bg-gradient-to-br from-white to-blue-50/50 dark:from-zinc-900 dark:to-blue-900/10 border-blue-100 dark:border-blue-900/30"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 h-full">
            
            {/* Left Side: Copy & Role Fit */}
            <div className="flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    color="green" 
                    pulse 
                    href="mailto:thomas.to.bcheme@gmail.com" 
                  >
                    AVAILABLE FOR HIRE
                  </Badge>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  Let's Engineer the Future.
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed max-w-xl">
                  If you are looking for an engineer who can architect 0&rarr;1 systems, automate tribal knowledge, 
                  and deploy AI agents, let's talk.
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">Ideal Role Fit</span>
                <div className="flex flex-wrap gap-2">
                  {['AI/ML Engineer', 'AI/ML Ops', 'Data Scientist', 'Senior Fullstack Software Engineer'].map((role) => (
                    <span key={role} className="px-2.5 py-1 rounded-md bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-xs font-medium text-zinc-700 dark:text-zinc-300 shadow-sm cursor-default hover:border-blue-400 transition-colors">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex flex-col gap-3 w-full md:w-auto shrink-0">
              <a 
                href="mailto:thomas.to.bcheme@gmail.com" 
                className="flex items-center justify-center gap-3 w-full md:w-48 px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white rounded-lg font-bold transition-all shadow-xl shadow-blue-200/50 dark:shadow-none group transform hover:scale-[1.02] active:scale-95"
              >
                <Mail size={18} />
                <span>Contact</span>
                <ArrowRight 
                  size={16} 
                  className="animate-pulse opacity-75 group-hover:translate-x-1 transition-transform" 
                />
              </a>
              
              <a 
                href="https://www.linkedin.com/in/thomas-to-ucdavis/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center gap-3 w-full md:w-48 px-4 py-3 bg-white hover:bg-blue-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-lg font-bold transition-all hover:border-blue-300"
              >
                <Linkedin size={18} />
                <span>View Profile</span>
              </a>
              
              <div className="text-center">
                <p className="text-[10px] text-zinc-400 flex items-center justify-center gap-1">
                  <Zap size={10} className="text-yellow-500" />
                  Response time: &lt; 24 hours
                </p>
              </div>
            </div>

          </div>
        </BentoCard>
      </BentoGrid>
    </section>
  );
};

export default Connect;