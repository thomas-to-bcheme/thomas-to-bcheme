"use client";

import React, { useState, useEffect } from 'react';
import { Server, Activity, GitBranch } from 'lucide-react';

// Helper function to get PST time
const getPST = () => new Date().toLocaleTimeString('en-US', {
  timeZone: 'America/Los_Angeles',
  hour12: true,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

const SystemStatusTicker = () => {
  const [latency, setLatency] = useState(24);
  // Initialize with null on server, actual value on client
  const [lastCall, setLastCall] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side and set initial time
    setIsClient(true);

    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * (45 - 20) + 20));
      setLastCall(getPST());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

return (
		<div className="flex flex-wrap gap-4 text-[10px] font-mono text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 py-2 px-4 rounded-full border border-zinc-200 dark:border-zinc-800 w-fit mb-8 shadow-sm hover:border-blue-200 transition-colors">
			<div className="flex items-center gap-1.5">
				<div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
				<span>SYSTEM: NOMINAL</span>
			</div>
			<div className="hidden sm:flex items-center gap-1.5">
				<Server size={10} />
				<span>REGION: US-West</span>
			</div>
			<div className="flex items-center gap-1.5">
				<Activity size={10} />
				<span>LATENCY: {latency}ms</span>
			</div>
			 <div className="hidden md:flex items-center gap-1.5">
				<GitBranch size={10} />
				<span>LOCAL TIME: {isClient ? (lastCall || getPST()) : "SYNCING..."} PST</span>
			</div>
		</div>
	);
};

export default SystemStatusTicker;