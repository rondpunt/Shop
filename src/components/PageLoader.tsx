import { useEffect, useState } from "react";

export const PageLoader = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      {/* Top progress bar */}
      <div className="h-1 w-full overflow-hidden bg-primary/20">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Skeleton skeleton structure */}
      <div className="flex-1 p-4 animate-pulse pt-safe">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-8 mt-2">
          <div className="h-10 w-10 rounded-full bg-muted/60" />
          <div className="h-6 flex-1 rounded bg-muted/60" />
        </div>
        
        {/* Content blocks */}
        <div className="space-y-4">
          <div className="h-32 w-full rounded-2xl bg-muted/60" />
          <div className="h-20 w-full rounded-2xl bg-muted/60" />
          <div className="h-20 w-full rounded-2xl bg-muted/60" />
          <div className="h-20 w-full rounded-2xl bg-muted/60" />
        </div>
      </div>
    </div>
  );
};
