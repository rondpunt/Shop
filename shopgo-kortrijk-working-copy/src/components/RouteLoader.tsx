import { useEffect, useState } from "react";

export const RouteLoader = () => {
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
    <div className="flex flex-col w-full h-full animate-fade-in">
      {/* Top progress bar (absolute to top of page) */}
      <div className="fixed top-0 left-0 right-0 z-[100] h-1 w-full overflow-hidden bg-primary/20">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Skeleton structure inside layout */}
      <div className="flex-1 p-4 animate-pulse pt-4 w-full">
        <div className="space-y-4">
          <div className="h-24 w-full rounded-2xl bg-muted/60" />
          <div className="h-16 w-full rounded-2xl bg-muted/60" />
          <div className="h-16 w-full rounded-2xl bg-muted/60" />
          <div className="h-16 w-full rounded-2xl bg-muted/60" />
        </div>
      </div>
    </div>
  );
};
