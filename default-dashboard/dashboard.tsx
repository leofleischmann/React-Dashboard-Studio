import { PageShell, Tabs, useHashRoute } from '@ha/layout';
import { StartPage } from './pages/StartPage';
import { WidgetReference } from './pages/WidgetReference';
import { LayoutDemo } from './pages/LayoutDemo';

// SDK-Referenz — wird bei der Erstinstallation in Home Assistant geladen.
// Ersetze oder erweitere es jederzeit (✎ Bearbeiten). Dein Code bleibt bei Updates erhalten.
const TABS = [
  { id: 'start', label: 'Start', icon: '📘' },
  { id: 'widgets', label: 'Widgets', icon: '🧩' },
  { id: 'layout', label: 'Layout', icon: '📐' },
];

export default function Dashboard() {
  const [page, setPage] = useHashRoute('start', ['start', 'widgets', 'layout']);

  return (
    <div className="rd-root rd-sdk-ref">
      <PageShell nav={<Tabs tabs={TABS} value={page} onChange={setPage} ariaLabel="SDK Referenz" />}>
        {page === 'start' && <StartPage />}
        {page === 'widgets' && <WidgetReference />}
        {page === 'layout' && <LayoutDemo />}
      </PageShell>
    </div>
  );
}
