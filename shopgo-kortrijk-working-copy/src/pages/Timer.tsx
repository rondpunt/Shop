import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useDataSource } from "@/hooks/useDataSource";

/**
 * /timer is a thin alias: redirects to the active session timer page if there is one,
 * otherwise back to the map.
 */
const Timer = () => {
  const { activeSession } = useDataSource();

  useEffect(() => {
    /* no-op: redirect handles it */
  }, []);

  if (activeSession) {
    return <Navigate to={`/session/${activeSession.id}`} replace />;
  }
  return <Navigate to="/" replace />;
};

export default Timer;
