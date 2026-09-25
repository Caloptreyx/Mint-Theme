import {
  faArrowLeft,
  faArrowRotateLeft,
  faArrowRotateRight,
  faArrowUpRightFromSquare,
  faBars,
  faBookOpen,
  faCubes,
  faDownload,
  faDroplet,
  faFont,
  faHouse,
  faImage,
  faRightToBracket,
  faRotateRight,
  faSwatchbook,
  faTableColumns,
  faTerminal,
  faTrashArrowUp,
  faUpload,
  faWandMagicSparkles,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useComputedColorScheme } from '@mantine/core';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { httpErrorToHuman } from '@/api/axios.ts';
import getServers from '@/api/server/getServers.ts';
import ActionIcon from '@/elements/ActionIcon.tsx';
import Button from '@/elements/Button.tsx';
import Group from '@/elements/Group.tsx';
import Select from '@/elements/input/Select.tsx';
import SegmentedControl from '@/elements/SegmentedControl.tsx';
import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import Title from '@/elements/Title.tsx';
import Tooltip from '@/elements/Tooltip.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import updateTheme from '../api/updateTheme.ts';
import { LOGIN_PREVIEW_PATH } from '../elements/auth/AuthScope.tsx';
import Sections, { type Section } from '../elements/editor/Sections.tsx';
import { loadTheme, type PreviewScheme, READY_MSG, rememberTheme, savedTheme, sendPreview } from '../lib/apply.ts';
import { DEFAULT_THEME, type NebulaTheme, normalizeTheme } from '../lib/theme.ts';
import { useExtTranslations } from '../translations.ts';

const SECTIONS: { id: Section; icon: IconDefinition }[] = [
  { id: 'presets', icon: faSwatchbook },
  { id: 'colours', icon: faDroplet },
  { id: 'style', icon: faFont },
  { id: 'interface', icon: faWandMagicSparkles },
  { id: 'navigation', icon: faBars },
  { id: 'components', icon: faCubes },
  { id: 'console', icon: faTerminal },
  { id: 'background', icon: faImage },
  { id: 'home', icon: faHouse },
  { id: 'articles', icon: faBookOpen },
  { id: 'layout', icon: faTableColumns },
  { id: 'login', icon: faRightToBracket },
];

type Device = 'desktop' | 'tablet' | 'mobile';
const DEVICE_WIDTH: Record<Device, number | null> = { desktop: null, tablet: 834, mobile: 390 };
const STAGE_PADDING = 24;
const HISTORY = 50;

/** Debounced undo/redo over whole drafts. */
function useHistory(draft: NebulaTheme, setDraft: (theme: NebulaTheme) => void) {
  const past = useRef<NebulaTheme[]>([]);
  const future = useRef<NebulaTheme[]>([]);
  const committed = useRef(draft);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const id = setTimeout(() => {
      if (draft === committed.current) return;
      past.current = [...past.current.slice(-(HISTORY - 1)), committed.current];
      future.current = [];
      committed.current = draft;
      rerender();
    }, 400);
    return () => clearTimeout(id);
  }, [draft]);

  const step = (from: typeof past, to: typeof past) => {
    const next = from.current.pop();
    if (!next) return;
    to.current.push(committed.current);
    committed.current = next;
    setDraft(next);
    rerender();
  };

  return {
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    undo: () => step(past, future),
    redo: () => step(future, past),
    restart: (theme: NebulaTheme) => {
      past.current = [];
      future.current = [];
      committed.current = theme;
    },
  };
}

export default function ThemeEditor() {
  const { t } = useExtTranslations();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<NebulaTheme>(savedTheme);
  const [saved, setSaved] = useState<NebulaTheme>(savedTheme);
  const [section, setSection] = useState<Section>('presets');
  const [device, setDevice] = useState<Device>('desktop');
  // the preview starts in the admin's own scheme; the toggle only ever touches the frame
  const adminScheme = useComputedColorScheme('dark', { getInitialValueInEffect: false });
  const [scheme, setScheme] = useState<PreviewScheme>(adminScheme);
  const [page, setPage] = useState('/');
  const [serverId, setServerId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [stage, setStage] = useState({ width: 0, height: 0 });

  const frame = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  // the draft can hold half-typed values, the preview keeps the last valid one for those
  const shown = useRef(draft);
  const history = useHistory(draft, setDraft);

  const set = (patch: Partial<NebulaTheme>) => setDraft((d) => ({ ...d, ...patch }));
  const dirty = JSON.stringify(normalizeTheme(draft, saved)) !== JSON.stringify(saved);

  useEffect(() => {
    loadTheme().then((theme) => {
      if (!theme) return;
      setDraft(theme);
      setSaved(theme);
      history.restart(theme);
    });
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

  const pages = useMemo(
    () => [
      ...(serverId
        ? [
            { value: `/server/${serverId}`, label: t('editor.pages.home', {}) },
            { value: `/server/${serverId}/console`, label: t('editor.pages.console', {}) },
          ]
        : []),
      { value: '/', label: t('editor.pages.servers', {}) },
      { value: '/account', label: t('editor.pages.account', {}) },
      { value: '/admin', label: t('editor.pages.admin', {}) },
      { value: LOGIN_PREVIEW_PATH, label: t('editor.pages.login', {}) },
    ],
    [serverId, t],
  );

  const doSave = () => {
    const theme = normalizeTheme(draft, saved);
    setSaving(true);
    updateTheme(theme)
      .then(() => {
        rememberTheme(theme);
        setSaved(theme);
        setDraft(theme);
        addToast(t('editor.saved', {}), 'success');
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setSaving(false));
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
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
        setDraft(normalizeTheme(parsed));
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

  return (
    <div className='fixed inset-0 z-[120] flex bg-(--mantine-color-body)'>
      <nav className='flex flex-col items-center gap-1 w-14 shrink-0 py-3 bg-(--nebula-card) border-r border-(--mantine-color-default-border)'>
        {SECTIONS.map(({ id, icon }) => (
          <Tooltip key={id} label={t(`editor.section.${id}`, {})} position='right'>
            <ActionIcon
              size='lg'
              variant={section === id ? 'light' : 'subtle'}
              color={section === id ? 'blue' : 'gray'}
              aria-label={t(`editor.section.${id}`, {})}
              onClick={() => {
                setSection(id);
                // the real auth pages redirect signed in admins, so the login section jumps to its preview route
                if (id === 'login') setPage(LOGIN_PREVIEW_PATH);
                if (id === 'console' && serverId) setPage(`/server/${serverId}/console`);
              }}
            >
              <FontAwesomeIcon icon={icon} />
            </ActionIcon>
          </Tooltip>
        ))}
        <div className='flex-1' />
        <Tooltip label={t('editor.close', {})} position='right'>
          <ActionIcon
            size='lg'
            variant='subtle'
            color='gray'
            aria-label={t('editor.close', {})}
            onClick={() => navigate('/admin/extensions')}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </ActionIcon>
        </Tooltip>
      </nav>

      <aside className='flex flex-col w-88 shrink-0 bg-(--nebula-card) border-r border-(--mantine-color-default-border)'>
        <Group
          justify='space-between'
          align='flex-start'
          wrap='nowrap'
          className='p-4 border-b border-(--mantine-color-default-border)'
        >
          <div className='min-w-0'>
            <Title order={4}>{t(`editor.section.${section}`, {})}</Title>
            <Text size='xs' c='dimmed'>
              {t(`editor.section.${section}Description`, {})}
            </Text>
          </div>
          <Group gap={2} wrap='nowrap'>
            {iconButton(t('editor.undo', {}), faArrowRotateLeft, history.undo, !history.canUndo)}
            {iconButton(t('editor.redo', {}), faArrowRotateRight, history.redo, !history.canRedo)}
          </Group>
        </Group>

        <div className='flex-1 min-h-0 overflow-y-auto p-4'>
          <Stack>
            <Sections section={section} theme={draft} set={set} />
          </Stack>
        </div>

        <Group gap={4} wrap='nowrap' className='p-3 border-t border-(--mantine-color-default-border)'>
          <Tooltip label={t('editor.reset', {})}>
            <ActionIcon
              variant='subtle'
              color='red'
              size='lg'
              aria-label={t('editor.reset', {})}
              onClick={() => setDraft(DEFAULT_THEME)}
            >
              <FontAwesomeIcon icon={faTrashArrowUp} />
            </ActionIcon>
          </Tooltip>
          {iconButton(t('editor.import', {}), faUpload, () => importRef.current?.click())}
          {iconButton(t('editor.export', {}), faDownload, doExport)}
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
          <Button className='ml-auto' disabled={!dirty} loading={saving} onClick={doSave}>
            {t('editor.save', {})}
          </Button>
        </Group>
      </aside>

      <main className='flex flex-col flex-1 min-w-0'>
        <Group gap='xs' className='p-3 border-b border-(--mantine-color-default-border)'>
          <SegmentedControl
            data={(['desktop', 'tablet', 'mobile'] as Device[]).map((d) => ({
              value: d,
              label: t(`editor.device.${d}`, {}),
            }))}
            value={device}
            onChange={(value) => setDevice(value as Device)}
          />
          <SegmentedControl
            data={(['dark', 'light'] as PreviewScheme[]).map((s) => ({
              value: s,
              label: t(`editor.scheme.${s}`, {}),
            }))}
            value={scheme}
            onChange={(value) => setScheme(value as PreviewScheme)}
          />
          <Select data={pages} value={page} onChange={(value) => value && setPage(value)} w={200} />
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
              title='preview'
              src={page}
              className='border-0 origin-top-left'
              style={{ width: logicalWidth, height: logicalHeight, transform: `scale(${scale})` }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
