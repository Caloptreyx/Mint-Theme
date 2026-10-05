import {
  faArrowDown,
  faArrowLeft,
  faArrowRight,
  faArrowUp,
  faIndent,
  faMagnifyingGlass,
  faOutdent,
  faRotateLeft,
  faRotateRight,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { type ReactNode, type SyntheticEvent, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useNebulaTheme } from '../../lib/apply.ts';
import { ActionIcon, Card, useFileManager, useVisualViewportBottomInset } from '../../lib/core.ts';
import {
  activeEditorIn,
  coarsePointer,
  editorsVersion,
  isReadOnly,
  NOTHING_TO_UNDO,
  reserveEditorBottom,
  subscribeEditors,
} from '../../lib/mobileEditor.ts';
import { useExtTranslations } from '../../translations.ts';

type Label = 'undo' | 'redo' | 'indent' | 'outdent' | 'find' | 'left' | 'right' | 'up' | 'down';

/** Monaco command ids (run like its own key bindings) and the keydown Pierre handles for the same key. */
const COMMANDS: { label: Label; icon: IconDefinition; command: string; pierre?: KeyboardEventInit }[] = [
  { label: 'undo', icon: faRotateLeft, command: 'undo' },
  { label: 'redo', icon: faRotateRight, command: 'redo' },
  { label: 'indent', icon: faIndent, command: 'tab', pierre: { key: 'Tab', code: 'Tab' } },
  { label: 'outdent', icon: faOutdent, command: 'outdent', pierre: { key: 'Tab', code: 'Tab', shiftKey: true } },
  // Pierre has no find widget
  { label: 'find', icon: faMagnifyingGlass, command: 'actions.find' },
];
/** Monaco's cursor commands; on Pierre the browser caret moves (`Selection.modify`), like a tap in the text. */
const ARROWS: {
  label: Label;
  icon: IconDefinition;
  command: string;
  move: ['backward' | 'forward', 'character' | 'line'];
}[] = [
  { label: 'left', icon: faArrowLeft, command: 'cursorLeft', move: ['backward', 'character'] },
  { label: 'right', icon: faArrowRight, command: 'cursorRight', move: ['forward', 'character'] },
  { label: 'up', icon: faArrowUp, command: 'cursorUp', move: ['backward', 'line'] },
  { label: 'down', icon: faArrowDown, command: 'cursorDown', move: ['forward', 'line'] },
];

/** The keys phone keyboards hide behind a second or third layer. */
const SYMBOLS = [
  '{',
  '}',
  '[',
  ']',
  '(',
  ')',
  '<',
  '>',
  '=',
  ':',
  ';',
  '"',
  "'",
  '/',
  '\\',
  '|',
  '_',
  '-',
  '#',
  '$',
  '~',
];

// the editor's text field keeps focus (and the on-screen keyboard stays open) when a key is pressed
const keepFocus = (e: SyntheticEvent) => e.preventDefault();

const subscribeCoarse = (listener: () => void) => {
  coarsePointer().addEventListener('change', listener);
  return () => coarsePointer().removeEventListener('change', listener);
};

function Key({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <ActionIcon variant='default' size={40} radius='md' className='shrink-0' aria-label={label} onClick={onPress}>
      {children}
    </ActionIcon>
  );
}

const divider = <div aria-hidden className='mx-0.5 w-px shrink-0 self-stretch bg-(--mantine-color-default-border)' />;

/**
 * `mobileEditor`: a row of keys phone keyboards lack for the file editor's Monaco (Tab, symbols, arrows, undo),
 * on touch devices below `lg`. It sits on top of the on-screen keyboard (the visual viewport's bottom inset),
 * else on the bottom edge or Mint's bottom bar (app.css), and keeps that strip of the editor clear.
 */
export default function EditorKeys() {
  const { mobileEditor } = useNebulaTheme();
  const { t } = useExtTranslations();
  const engine = useFileManager((state) => state.editorEngine);
  const touch = useSyncExternalStore(subscribeCoarse, () => coarsePointer().matches);
  const editors = useSyncExternalStore(subscribeEditors, editorsVersion);
  const inset = useVisualViewportBottomInset();
  // the editor this row drives is the one inside the same page content as the marker below
  const marker = useRef<HTMLSpanElement>(null);
  const [scope, setScope] = useState<HTMLElement | null>(null);
  const [pierre, setPierre] = useState<HTMLElement | null>(null);
  const bar = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => setScope(marker.current?.parentElement ?? null), []);

  // Core's other engine, Pierre (its default on touch devices), is not exposed to extensions: it edits a
  // contenteditable inside the `diffs-container` shadow root. Typing goes through the browser's `insertText`
  // and undo commands and keys through keydown, which is what Pierre listens to itself. It renders after the
  // file loads (inside its shadow root, which the scope's observer can't see) and is replaced when another
  // file opens.
  useLayoutEffect(() => {
    if (!scope || engine !== 'pierre') {
      setPierre(null);
      return;
    }
    const observer = new MutationObserver(() => find());
    const watched = new WeakSet<Node>();
    const find = () => {
      const root = scope.querySelector('diffs-container')?.shadowRoot;
      if (root && !watched.has(root)) {
        watched.add(root);
        observer.observe(root, { childList: true, subtree: true, attributeFilter: ['contenteditable'] });
      }
      setPierre(root?.querySelector<HTMLElement>('[contenteditable="true"]') ?? null);
    };
    observer.observe(scope, { childList: true, subtree: true });
    find();
    return () => observer.disconnect();
  }, [scope, engine]);

  const active = mobileEditor && touch;
  const editor = active && engine === 'monaco' ? activeEditorIn(scope, editors) : null;
  const pierreTarget = active && engine === 'pierre' ? pierre : null;
  const shown = (!!editor && !isReadOnly(editor, editors)) || !!pierreTarget;

  useLayoutEffect(() => {
    const el = bar.current;
    if (!shown || !el) return;
    const host =
      pierreTarget?.getRootNode() instanceof ShadowRoot ? (pierreTarget.getRootNode() as ShadowRoot).host : null;

    let release = NOTHING_TO_UNDO;
    // hidden from `lg` up measures 0 and reserves nothing
    const measure = () => {
      release();
      const covered = el.offsetHeight ? Math.round(window.innerHeight - inset - el.getBoundingClientRect().top) : 0;
      if (covered <= 0) {
        release = NOTHING_TO_UNDO;
      } else if (editor) {
        release = reserveEditorBottom(editor, covered);
      } else if (host instanceof HTMLElement) {
        const before = host.style.paddingBottom;
        host.style.paddingBottom = `${covered}px`;
        release = () => {
          host.style.paddingBottom = before;
        };
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      release();
    };
  }, [shown, editor, pierreTarget, inset]);

  const run = (command: string, payload: unknown = null) => {
    if (!editor) return;
    editor.focus();
    // 'keyboard' so a typed key gets Monaco's typing rules (auto closed brackets and quotes, overtyping)
    editor.trigger('keyboard', command, payload);
  };

  const pierreKey = (init: KeyboardEventInit) => {
    if (!pierreTarget) return;
    pierreTarget.focus();
    pierreTarget.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, composed: true, ...init }),
    );
  };

  const pierreCommand = (command: 'insertText' | 'undo' | 'redo', text?: string) => {
    if (!pierreTarget) return;
    pierreTarget.focus();
    // the only way to type into a contenteditable that its own input handling (and undo history) sees
    document.execCommand(command, false, text);
  };

  const press = (label: Label, command: string, key?: KeyboardEventInit) => {
    if (editor) return run(command);
    if (label === 'undo' || label === 'redo') return pierreCommand(label);
    if (key) pierreKey(key);
  };

  // Pierre's own arrow handling lags one step behind text inserted by execCommand; the browser caret doesn't
  const pierreMove = ([direction, unit]: ['backward' | 'forward', 'character' | 'line']) => {
    if (!pierreTarget) return;
    pierreTarget.focus();
    const root = pierreTarget.getRootNode() as ShadowRoot & { getSelection?: () => Selection | null };
    (root.getSelection?.() ?? document.getSelection())?.modify('move', direction, unit);
  };

  return (
    <>
      <span ref={marker} hidden />
      {shown && (
        <Card
          ref={bar}
          padding={0}
          role='toolbar'
          aria-label={t('mobileEditor.toolbar', {})}
          data-nebula-editor-keys=''
          className='fixed! inset-x-0 z-100 rounded-none! border-x-0! border-b-0! backdrop-blur-md lg:hidden!'
          style={inset ? { bottom: inset, paddingBottom: 0 } : undefined}
          onPointerDown={keepFocus}
          onMouseDown={keepFocus}
        >
          <div className='flex items-center gap-1 overflow-x-auto overscroll-x-contain py-1 pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))] [scrollbar-width:none]'>
            {COMMANDS.filter(({ pierre: key, label }) => editor || key || label === 'undo' || label === 'redo').map(
              ({ label, icon, command, pierre: key }) => (
                <Key key={label} label={t(`mobileEditor.${label}`, {})} onPress={() => press(label, command, key)}>
                  <FontAwesomeIcon icon={icon} />
                </Key>
              ),
            )}
            {divider}
            {SYMBOLS.map((symbol) => (
              <Key
                key={symbol}
                label={t('mobileEditor.type', { key: symbol })}
                onPress={() => (editor ? run('type', { text: symbol }) : pierreCommand('insertText', symbol))}
              >
                <span className='font-mono text-base leading-none'>{symbol}</span>
              </Key>
            ))}
            {divider}
            {ARROWS.map(({ label, icon, command, move }) => (
              <Key
                key={label}
                label={t(`mobileEditor.${label}`, {})}
                onPress={() => (editor ? run(command) : pierreMove(move))}
              >
                <FontAwesomeIcon icon={icon} />
              </Key>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
