import { faDiscord } from '@fortawesome/free-brands-svg-icons';
import {
  faArrowLeft,
  faArrowRotateLeft,
  faArrowRotateRight,
  faArrowUpRightFromSquare,
  faClockRotateLeft,
  faDisplay,
  faDownload,
  faEllipsisVertical,
  faRotateRight,
  faTrashArrowUp,
  faUpload,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Loader, useComputedColorScheme } from '@mantine/core';
import { isAxiosError } from 'axios';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useBeforeUnload, useNavigate } from 'react-router';
import updateTheme from '../api/updateTheme.ts';
import { LOGIN_PREVIEW_PATH } from '../elements/auth/AuthScope.tsx';
import EditorNav, { SECTION_ICONS } from '../elements/editor/EditorNav.tsx';
import PanelResizer, { storedPanelWidth } from '../elements/editor/PanelResizer.tsx';
import Sections, { type Section } from '../elements/editor/Sections.tsx';
import {
  revealLabel,
  type SettingHit,
  SettingResults,
  SettingSearchInput,
  useSettingSearch,
} from '../elements/editor/SettingsSearch.tsx';
import HistoryModal from '../elements/library/HistoryModal.tsx';
import {
  applyLocalTheme,
  clearLocalTheme,
  holdSiteTheme,
  loadTheme,
  type PreviewScheme,
  READY_MSG,
  rememberTheme,
  savedTheme,
  sendPreview,
  useLocalTheme,
} from '../lib/apply.ts';
import {
  ActionIcon,
  Alert,
  Button,
  ConfirmationModal,
  Group,
  getServers,
  httpErrorToHuman,
  Menu,
  Modal,
  ModalFooter,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
  Tooltip,
  useAdminCan,
  useBlocker,
  useKeyboardShortcuts,
  useToast,
} from '../lib/core.ts';
import { invalidUrls, isThemeFile } from '../lib/editorDraft.ts';
import { useCanSaveTheme } from '../lib/permissions.ts';
import { DEFAULT_THEME, type NebulaTheme, normalizeTheme } from '../lib/theme.ts';
import { useExtTranslations } from '../translations.ts';

const SUPPORT_URL = 'https://discord.gg/4qjMWU7S8x';

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 834, mobile: 390 };
const STAGE_PADDING = 24;
const HISTORY = 50;

/** Debounced undo/redo over whole drafts. */
function useHistory(draft: NebulaTheme, setDraft: (theme: NebulaTheme) => void) {
  const past = useRef<NebulaTheme[]>([]);
  const future = useRef<NebulaTheme[]>([]);
  const committed = useRef(draft);
  const latest = useRef(draft);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  /** Records the live draft as a step of its own, so undo inside the debounce window doesn't lose it. */
  const flush = () => {
    if (latest.current === committed.current) return;
    past.current = [...past.current.slice(-(HISTORY - 1)), committed.current];
    future.current = [];
    committed.current = latest.current;
  };

  useEffect(() => {
    latest.current = draft;
    const id = setTimeout(() => {
      flush();
      rerender();
    }, 400);
    return () => clearTimeout(id);
  }, [draft]);

  const step = (from: typeof past, to: typeof past) => {
    flush();
    const next = from.current.pop();
    if (!next) return rerender();
    to.current.push(committed.current);
    committed.current = next;
    latest.current = next;
    setDraft(next);
    rerender();
  };

  const pending = draft !== committed.current;
  return {
    canUndo: past.current.length > 0 || pending,
    canRedo: future.current.length > 0 && !pending,
    undo: () => step(past, future),
    redo: () => step(future, past),
    restart: (theme: NebulaTheme) => {
      past.current = [];
      future.current = [];
      committed.current = theme;
      latest.current = theme;
    },
  };
}

export default function ThemeEditor() {
  const { t } = useExtTranslations();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<NebulaTheme>(savedTheme);
  const [saved, setSaved] = useState<NebulaTheme>(savedTheme);
  // the cache can be stale or missing (then it is the default), so nothing is saved until the real one loaded
  const [load, setLoad] = useState<'pending' | 'ok' | 'failed'>('pending');
  // the stored theme's version, sent as `base` so a save never replaces a theme saved elsewhere meanwhile
  const version = useRef('');
  // the theme a save was refused for (409), until the admin reloads or overwrites
  const [conflict, setConflict] = useState<NebulaTheme | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [section, setSection] = useState<Section>('presets');
  const [query, setQuery] = useState('');
  // the label a search result jumps to, revealed once its section has rendered
  const [reveal, setReveal] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>('desktop');
  // the preview starts in the admin's own scheme; the toggle only ever touches the frame
  const adminScheme = useComputedColorScheme('dark', { getInitialValueInEffect: false });
  const [scheme, setScheme] = useState<PreviewScheme>(adminScheme);
  const [page, setPage] = useState('/');
  const [serverId, setServerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [panelWidth, setPanelWidth] = useState(storedPanelWidth);
  const [resizing, setResizing] = useState(false);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  // the draft can hold half-typed values; the preview, derived colours and contrast use the last valid one
  const [valid, setValid] = useState(draft);

  const frame = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const shown = useRef(draft);
  const history = useHistory(draft, setDraft);
  const hits = useSettingSearch(query);

  const set = (patch: Partial<NebulaTheme>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(normalizeTheme(draft, saved)) !== JSON.stringify(saved);
  const badUrls = invalidUrls(draft).length > 0;
  // without settings.update or mint-theme.update the draft can only be tried out with 'Apply in this browser'
  const canSaveTheme = useCanSaveTheme();
  const canSave = dirty && load === 'ok' && !badUrls && canSaveTheme;
  const local = useLocalTheme();
  // a role with only the Mint permission reaches the admin area, not necessarily its extensions page
  const closeTo = useAdminCan('extensions.*') ? '/admin/extensions' : '/admin';

  const blocker = useBlocker(dirty);
  useBeforeUnload((e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  // the editor edits the site theme, so it shows that, never the admin's own pick
  useEffect(() => holdSiteTheme(), []);

  /** Loads the stored theme; `replace` drops the draft, otherwise edits made meanwhile are kept. */
  const fetchTheme = (replace: boolean) => {
    const start = draft;
    setLoad('pending');
    loadTheme().then((res) => {
      if (!res) {
        setLoad('failed');
        return;
      }
      version.current = res.version;
      setSaved(res.theme);
      setDraft((d) => {
        if (!replace && d !== start) return d;
        history.restart(res.theme);
        return res.theme;
      });
      setLoad('ok');
    });
  };

  useEffect(() => {
    fetchTheme(false);
    getServers(1, undefined, true)
      .then((res) => {
        const id = res.data[0]?.uuidShort;
        if (!id) return;
        setServerId(id);
        setPage(`/server/${id}`);
      })
      .catch(() => {
        // server pages are simply left out of the picker
      });
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setStage({ width: el.clientWidth, height: el.clientHeight }));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    shown.current = normalizeTheme(draft, shown.current);
    setValid(shown.current);
    const id = setTimeout(() => sendPreview(frame.current, shown.current, scheme), 60);
    return () => clearTimeout(id);
  }, [draft, scheme]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if ((event.data as { type?: string } | null)?.type === READY_MSG) {
        sendPreview(frame.current, shown.current, scheme);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [scheme]);

  useEffect(() => {
    if (!reveal || !contentRef.current) return;
    return revealLabel(contentRef.current, reveal, () => setReveal(null));
  }, [reveal]);

  const home = valid.serverHome;
  const consolePage = home ? `/server/${serverId}/console` : `/server/${serverId}`;
  const pages = useMemo(
    () => [
      ...(serverId && home ? [{ value: `/server/${serverId}`, label: t('editor.pages.home', {}) }] : []),
      ...(serverId ? [{ value: consolePage, label: t('editor.pages.console', {}) }] : []),
      { value: '/', label: t('editor.pages.servers', {}) },
      { value: '/account', label: t('editor.pages.account', {}) },
      { value: '/admin', label: t('editor.pages.admin', {}) },
      { value: LOGIN_PREVIEW_PATH, label: t('editor.pages.login', {}) },
    ],
    [serverId, home, consolePage, t],
  );

  // core builds the server routes once per server router, so turning Home on or off reloads the preview; without
  // Home the console's own path is gone, so the preview opens the console at the server root instead
  const shownHome = useRef(home);
  useEffect(() => {
    if (shownHome.current === home) return;
    shownHome.current = home;
    if (!serverId || !page.startsWith(`/server/${serverId}`)) return;
    if (!home && page === `/server/${serverId}/console`) setPage(consolePage);
    else frame.current?.contentWindow?.location.reload();
  }, [home]);

  /** Stores `theme` (made from the draft `sent`); without `base` it replaces whatever is stored. */
  const store = (theme: NebulaTheme, sent: NebulaTheme, base?: string) => {
    setSaving(true);
    updateTheme(theme, base)
      .then((res) => {
        version.current = res.version;
        rememberTheme(theme);
        setSaved(theme);
        // edits made while the request was out stay in the draft (and count as unsaved)
        setDraft((d) => (d === sent ? theme : d));
        setConflict(null);
        addToast(t('editor.saved', {}), 'success');
      })
      .catch((err) => {
        if (base !== undefined && isAxiosError(err) && err.response?.status === 409) setConflict(theme);
        else addToast(httpErrorToHuman(err), 'error');
      })
      .finally(() => setSaving(false));
  };

  const doSave = () => {
    if (canSave && !saving) store(normalizeTheme(draft, saved), draft, version.current);
  };

  useKeyboardShortcuts({
    shortcuts: [
      { key: 's', modifiers: ['ctrlOrMeta'], allowWhenInputFocused: true, callback: doSave },
      // not while typing: there the field's own undo wins
      { key: 'z', modifiers: ['ctrlOrMeta', 'shift'], callback: history.redo },
      { key: 'z', modifiers: ['ctrlOrMeta'], callback: history.undo },
    ],
  });

  const openSection = (id: Section) => {
    setSection(id);
    // the real auth pages redirect signed in admins, so the login section jumps to its preview route
    if (id === 'login') setPage(LOGIN_PREVIEW_PATH);
    if (id === 'servers') setPage('/');
    if (id === 'home' && serverId) setPage(`/server/${serverId}`);
    if (id === 'console' && serverId) setPage(consolePage);
  };

  const pick = (hit: SettingHit) => {
    openSection(hit.doc.setting.section);
    setQuery('');
    setReveal(hit.doc.label);
  };

  /** 'Apply in this browser': the draft becomes the site theme here only, auth pages included, until 'Stop'. */
  const doApplyLocal = () => {
    applyLocalTheme(normalizeTheme(draft, saved));
    addToast(t('localTheme.applied', {}), 'success');
  };

  const doStopLocal = () => {
    clearLocalTheme();
    addToast(t('localTheme.stopped', {}), 'success');
  };

  const doExport = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(normalizeTheme(draft, saved), null, 2)], { type: 'application/json' }),
    );
    link.download = 'mint-theme.json';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const doImport = (file: File) =>
    file
      .text()
      .then((body) => {
        const parsed = JSON.parse(body);
        if (!isThemeFile(parsed)) throw new Error();
        setDraft(normalizeTheme(parsed));
        addToast(t('editor.imported', {}), 'success');
      })
      .catch(() => addToast(t('editor.importFailed', {}), 'error'));

  const available = Math.max(320, stage.width - STAGE_PADDING * 2);
  const logicalWidth = DEVICE_WIDTH[device] ?? available;
  const scale = Math.min(1, available / logicalWidth);
  const logicalHeight = Math.max(320, stage.height - STAGE_PADDING * 2) / scale;

  const iconButton = (label: string, icon: IconDefinition, onClick: () => void, disabled = false) => (
    <Tooltip label={label}>
      <ActionIcon variant='subtle' color='gray' size='lg' aria-label={label} disabled={disabled} onClick={onClick}>
        <FontAwesomeIcon icon={icon} />
      </ActionIcon>
    </Tooltip>
  );

  const saveBlocked = !canSaveTheme
    ? t('editor.noPermission', {})
    : load === 'pending'
      ? t('editor.loading', {})
      : load === 'failed'
        ? t('editor.loadFailed', {})
        : badUrls
          ? t('editor.fixUrls', {})
          : null;

  return (
    <div className='fixed inset-0 z-[120] flex flex-col bg-(--mantine-color-body)'>
      <header className='flex h-14 shrink-0 items-center gap-2 px-3 bg-(--nebula-card) border-b border-(--mantine-color-default-border)'>
        {iconButton(t('editor.close', {}), faArrowLeft, () => navigate(closeTo))}
        <div className='min-w-0 mr-auto'>
          <Text size='sm' fw={600} truncate>
            {t('nav.editor', {})}
          </Text>
          <Text size='xs' c={dirty ? 'yellow' : 'dimmed'} role='status' truncate>
            {load === 'pending'
              ? t('editor.loading', {})
              : dirty
                ? t('editor.status.unsaved', {})
                : t('editor.status.saved', {})}
          </Text>
        </div>
        <Group gap={2} wrap='nowrap'>
          {iconButton(t('editor.undo', {}), faArrowRotateLeft, history.undo, !history.canUndo)}
          {iconButton(t('editor.redo', {}), faArrowRotateRight, history.redo, !history.canRedo)}
          {iconButton(t('library.history', {}), faClockRotateLeft, () => setHistoryOpen(true))}
          <Menu position='bottom-end'>
            <Menu.Target>
              <ActionIcon variant='subtle' color='gray' size='lg' aria-label={t('editor.more', {})}>
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<FontAwesomeIcon icon={faUpload} />} onClick={() => importRef.current?.click()}>
                {t('editor.import', {})}
              </Menu.Item>
              <Menu.Item leftSection={<FontAwesomeIcon icon={faDownload} />} onClick={doExport}>
                {t('editor.export', {})}
              </Menu.Item>
              <Menu.Item
                leftSection={<FontAwesomeIcon icon={faDiscord} />}
                onClick={() => window.open(SUPPORT_URL, '_blank', 'noopener,noreferrer')}
              >
                {t('editor.support', {})}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color='red'
                leftSection={<FontAwesomeIcon icon={faTrashArrowUp} />}
                onClick={() => setConfirmReset(true)}
              >
                {t('editor.reset', {})}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
        <input
          ref={importRef}
          type='file'
          accept='.json,application/json'
          className='hidden'
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) doImport(file);
          }}
        />
        <div className='mx-1 h-6 w-px bg-(--mantine-color-default-border)' />
        {local && (
          <Tooltip label={t('localTheme.editorActive', {})} multiline w={280}>
            <Button
              variant='light'
              color='yellow'
              leftSection={<FontAwesomeIcon icon={faDisplay} />}
              onClick={doStopLocal}
            >
              {t('localTheme.stop', {})}
            </Button>
          </Tooltip>
        )}
        <Tooltip label={badUrls ? t('editor.fixUrls', {}) : t('localTheme.applyDescription', {})} multiline w={280}>
          <Button
            variant={canSaveTheme ? 'default' : 'filled'}
            leftSection={local ? undefined : <FontAwesomeIcon icon={faDisplay} />}
            disabled={badUrls}
            onClick={doApplyLocal}
          >
            {t('localTheme.apply', {})}
          </Button>
        </Tooltip>
        {dirty && (
          <Button variant='subtle' color='gray' onClick={() => setDraft(saved)}>
            {t('editor.discard', {})}
          </Button>
        )}
        <Tooltip label={saveBlocked} disabled={!saveBlocked || (canSaveTheme && !dirty)} multiline w={280}>
          <div>
            <Button disabled={!canSave} loading={saving} onClick={doSave}>
              {t('editor.save', {})}
            </Button>
          </div>
        </Tooltip>
      </header>

      <div className='flex flex-1 min-h-0'>
        <EditorNav
          section={section}
          onSection={(id) => {
            setQuery('');
            openSection(id);
          }}
          search={<SettingSearchInput query={query} onQuery={setQuery} onSubmit={() => hits[0] && pick(hits[0])} />}
        />

        <aside
          className='flex flex-col shrink-0 min-w-80 max-w-[calc(100vw-36rem)] bg-(--nebula-card) border-r border-(--mantine-color-default-border)'
          style={{ width: panelWidth }}
        >
          <div className='px-5 pt-4 pb-3 border-b border-(--mantine-color-default-border)'>
            <Title order={4}>{t(`editor.section.${section}`, {})}</Title>
            <Text size='xs' c='dimmed'>
              {t(`editor.section.${section}Description`, {})}
            </Text>
          </div>

          {load === 'pending' && (
            <Group gap='xs' className='px-5 pt-3' role='status'>
              <Loader size='xs' />
              <Text size='xs' c='dimmed'>
                {t('editor.loading', {})}
              </Text>
            </Group>
          )}
          {load === 'failed' && (
            <div className='px-5 pt-3'>
              <Alert color='red' title={t('editor.loadFailed', {})}>
                <Stack gap='xs' align='flex-start'>
                  <Text size='xs'>{t('editor.loadFailedDescription', {})}</Text>
                  <Button size='xs' variant='light' color='red' onClick={() => fetchTheme(false)}>
                    {t('editor.retry', {})}
                  </Button>
                </Stack>
              </Alert>
            </div>
          )}
          {!canSaveTheme && (
            <Text size='xs' c='dimmed' className='px-5 pt-3'>
              {t('editor.noPermission', {})}
            </Text>
          )}

          <div ref={contentRef} className='flex-1 min-h-0 overflow-y-auto px-5 py-4'>
            {query.trim() ? (
              <SettingResults query={query} hits={hits} icons={SECTION_ICONS} onPick={pick} />
            ) : (
              <Sections section={section} theme={draft} valid={valid} set={set} />
            )}
          </div>
          <HistoryModal opened={historyOpen} onClose={() => setHistoryOpen(false)} onLoad={setDraft} />
        </aside>

        <PanelResizer width={panelWidth} onWidth={setPanelWidth} onDragging={setResizing} />

        <main className='flex flex-col flex-1 min-w-0'>
          <Group gap='xs' className='p-3 border-b border-(--mantine-color-default-border)'>
            <SegmentedControl
              aria-label={t('editor.previewDevice', {})}
              data={(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => ({
                value: d,
                label: t(`editor.device.${d}`, {}),
              }))}
              value={device}
              onChange={(value) => setDevice(value as Device)}
            />
            <SegmentedControl
              aria-label={t('editor.previewScheme', {})}
              data={(['dark', 'light'] as PreviewScheme[]).map((s) => ({
                value: s,
                label: t(`editor.scheme.${s}`, {}),
              }))}
              value={scheme}
              onChange={(value) => setScheme(value as PreviewScheme)}
            />
            <Select
              aria-label={t('editor.previewPage', {})}
              data={pages}
              value={page}
              onChange={(value) => value && setPage(value)}
              w={200}
            />
            {iconButton(t('editor.refresh', {}), faRotateRight, () => frame.current?.contentWindow?.location.reload())}
            {iconButton(t('editor.openTab', {}), faArrowUpRightFromSquare, () =>
              window.open(page, '_blank', 'noopener,noreferrer'),
            )}
          </Group>

          <div
            ref={stageRef}
            className='flex-1 min-h-0 flex justify-center overflow-hidden'
            style={{ padding: STAGE_PADDING }}
          >
            <div
              className='shrink-0 overflow-hidden rounded-lg border border-(--mantine-color-default-border) shadow-xl'
              style={{ width: logicalWidth * scale, height: logicalHeight * scale }}
            >
              <iframe
                ref={frame}
                title={t('editor.previewFrame', {})}
                src={page}
                className={`border-0 origin-top-left ${resizing ? 'pointer-events-none' : ''}`}
                style={{ width: logicalWidth, height: logicalHeight, transform: `scale(${scale})` }}
              />
            </div>
          </div>
        </main>
      </div>

      <ConfirmationModal
        opened={blocker.state === 'blocked'}
        onClose={blocker.reset}
        onConfirmed={blocker.proceed}
        title={t('editor.leaveTitle', {})}
        confirm={t('editor.leave', {})}
      >
        {t('editor.leaveConfirm', {})}
      </ConfirmationModal>
      <ConfirmationModal
        opened={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirmed={() => {
          setDraft(DEFAULT_THEME);
          setConfirmReset(false);
        }}
        title={t('editor.resetTitle', {})}
        confirm={t('editor.reset', {})}
      >
        {t('editor.resetConfirm', {})}
      </ConfirmationModal>
      <Modal opened={!!conflict} onClose={() => setConflict(null)} title={t('editor.conflictTitle', {})}>
        <Text size='sm'>{t('editor.conflictDescription', {})}</Text>
        <ModalFooter>
          <Button
            color='red'
            loading={saving}
            disabled={!canSaveTheme}
            onClick={() => {
              if (conflict) store(conflict, draft);
            }}
          >
            {t('editor.conflictOverwrite', {})}
          </Button>
          <Button
            variant='default'
            disabled={saving}
            onClick={() => {
              setConflict(null);
              fetchTheme(true);
            }}
          >
            {t('editor.conflictReload', {})}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
