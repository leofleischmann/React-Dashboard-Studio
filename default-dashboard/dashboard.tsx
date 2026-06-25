import { PageShell, Tabs, useHashRoute, type TabItem } from '@ha/layout';
import type { ExampleTab } from './types';
import { HomePage } from './pages/HomePage';
import { WidgetReference } from './pages/WidgetReference';
import { ChartsPage } from './pages/ChartsPage';
import { HooksPage } from './pages/HooksPage';
import { LayoutDemo } from './pages/LayoutDemo';
import { FormatPage } from './pages/FormatPage';

const TABS: TabItem<ExampleTab>[] = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'widgets', label: 'Widgets', icon: '🧩' },
  { id: 'charts', label: 'Charts', icon: '📈' },
  { id: 'hooks', label: 'Hooks', icon: '⚡' },
  { id: 'layout', label: 'Layout', icon: '📐' },
  { id: 'format', label: 'Format', icon: '🔤' },
];

const VALID_PAGES = [
  'home',
  'widgets',
  'charts',
  'hooks',
  'layout',
  'format',
] as const satisfies readonly ExampleTab[];

/** Beispiel-Dashboard — bei Erstinstallation mitgeliefert, vollständig über ✎ Bearbeiten anpassbar. */
export default function Dashboard() {
  const [page, setPage] = useHashRoute<ExampleTab>('home', VALID_PAGES);

  return (
    <div className="rd-root rd-dd">
      <PageShell
        nav={<Tabs tabs={TABS} value={page} onChange={setPage} ariaLabel="Beispiel-Dashboard" />}
      >
        {page === 'home' && <HomePage onNavigate={setPage} />}
        {page === 'widgets' && <WidgetReference />}
        {page === 'charts' && <ChartsPage />}
        {page === 'hooks' && <HooksPage />}
        {page === 'layout' && <LayoutDemo />}
        {page === 'format' && <FormatPage />}
      </PageShell>
    </div>
  );
}
