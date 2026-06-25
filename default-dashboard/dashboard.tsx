import { PageShell, Tabs, useHashRoute, type TabItem } from '@ha/layout';
import { OverviewPage } from './pages/OverviewPage';
import { WidgetReference } from './pages/WidgetReference';
import { ChartsPage } from './pages/ChartsPage';
import { HooksPage } from './pages/HooksPage';
import { LayoutDemo } from './pages/LayoutDemo';
import { FormatPage } from './pages/FormatPage';

type Page = 'overview' | 'widgets' | 'charts' | 'hooks' | 'layout' | 'format';

const TABS: TabItem<Page>[] = [
  { id: 'overview', label: 'Overview', icon: '✨' },
  { id: 'widgets', label: 'Widgets', icon: '🧩' },
  { id: 'charts', label: 'Charts', icon: '📈' },
  { id: 'hooks', label: 'Hooks', icon: '⚡' },
  { id: 'layout', label: 'Layout', icon: '📐' },
  { id: 'format', label: 'Format', icon: '🔤' },
];

/** SDK-Referenz — bei Erstinstallation in Home Assistant. Jederzeit via ✎ Bearbeiten anpassbar. */
export default function Dashboard() {
  const [page, setPage] = useHashRoute<Page>('overview', [
    'overview',
    'widgets',
    'charts',
    'hooks',
    'layout',
    'format',
  ]);

  return (
    <div className="rd-root rd-sdk-ref rd-sdk-showcase">
      <PageShell
        nav={<Tabs tabs={TABS} value={page} onChange={setPage} ariaLabel="SDK Showcase" />}
      >
        {page === 'overview' && <OverviewPage onNavigate={setPage} />}
        {page === 'widgets' && <WidgetReference />}
        {page === 'charts' && <ChartsPage />}
        {page === 'hooks' && <HooksPage />}
        {page === 'layout' && <LayoutDemo />}
        {page === 'format' && <FormatPage />}
      </PageShell>
    </div>
  );
}
