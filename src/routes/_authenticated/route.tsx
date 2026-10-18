import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from 'react';
import { TabWorkspace } from '@/components/tab-workspace';
import { Shell } from '@/components/app-shell';
import { StartupContent, StartupRecovery } from '@/components/startup-recovery';
import { useStartupAuth } from '@/lib/startup-auth';

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  pendingMs: 0,
  pendingComponent: () => <Shell><StartupContent checking/></Shell>,
  component: AuthenticatedStartup,
});
function AuthenticatedStartup() {
  const auth = useStartupAuth(); const navigate = useNavigate();
  useEffect(() => { if (auth.status === 'ready' && !auth.session) void navigate({ to: '/login', replace: true }); }, [auth.status, auth.session, navigate]);
  if (auth.session) return <TabWorkspace/>;
  return <Shell>{auth.status === 'error' ? <StartupRecovery retry={auth.retry}/> : <StartupContent checking retry={auth.retry}/>}</Shell>;
}
