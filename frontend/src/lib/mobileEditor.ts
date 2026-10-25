import type { ExtensionContext } from 'shared';
import { currentTheme, subscribeTheme } from './apply.ts';

// the handler type of core's registry: @monaco-editor/react's up to panel 1.2.6, core's own loader's from 1.2.7
type OnMount = Parameters<ExtensionContext['extensionRegistry']['elements']['monacoEditor']['addOnMountHandler']>[0];

export type CodeEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];
type EditorOptions = Parameters<CodeEditor['updateOptions']>[0];
type OptionKey = keyof EditorOptions;

/** Below this editor width (its own box, so a virtual window counts, not the screen) a touch device is a phone. */
const PHONE_WIDTH = 768;
/** iOS zooms the page into any focused text field under 16px. */
const MIN_FONT_SIZE = 16;

/** Wrapped lines, a slim gutter, no popups (they don't fit a phone and cover the text) and wider scrollbars. */
const PHONE_OPTIONS = {
  wordWrap: 'on',
  minimap: { enabled: false },
  folding: false,
  glyphMargin: false,
  lineNumbersMinChars: 3,
  lineDecorationsWidth: 4,
  scrollBeyondLastLine: false,
  quickSuggestions: false,
  suggestOnTriggerCharacters: false,
  parameterHints: { enabled: false },
  stickyScroll: { enabled: false },
  overviewRulerLanes: 0,
  scrollbar: { verticalScrollbarSize: 18, horizontalScrollbarSize: 16 },
  renderLineHighlight: 'line',
} satisfies EditorOptions;
let phoneOptions: Partial<Record<OptionKey, unknown>> | null = null;

/**
 * PHONE_OPTIONS plus the hover turned off. `hover.enabled` is a boolean up to Monaco 0.55 (panel 1.2.6) and
 * 'on' | 'off' | 'onKeyboardModifier' from 0.57 (panel 1.2.7), and each version reads the other's value as on, so
 * the value follows the type of the loaded Monaco's default.
 */
function phoneOptionsFor(monaco: Monaco) {
  if (!phoneOptions) {
    const enabled = monaco.editor.EditorOptions.hover.defaultValue.enabled;
    phoneOptions = { ...PHONE_OPTIONS, hover: { enabled: typeof enabled === 'string' ? 'off' : false } };
  }
  return phoneOptions;
}

interface Mounted {
  editor: CodeEditor;
  monaco: Monaco;
}

/** Every mounted Monaco editor, the most recently focused last. */
const mounted: Mounted[] = [];
const listeners = new Set<() => void>();
let version = 0;

function notify() {
  version++;
  for (const listener of listeners) listener();
}

export const subscribeEditors = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Changes whenever an editor mounts, unmounts, gets focus or changes its read only state. */
export const editorsVersion = () => version;

/**
 * The most recently focused (else the last mounted) editor inside `scope`: the one a page's toolbar drives.
 * `version` is the `editorsVersion()` the caller rendered with. The panel builds with the React Compiler, which
 * caches a call by its arguments, so without it a component would keep the answer from before Monaco loaded.
 */
export function activeEditorIn(scope: Element | null, version: number): CodeEditor | null {
  if (!scope || version < 0) return null;
  for (let i = mounted.length - 1; i >= 0; i--) {
    if (scope.contains(mounted[i].editor.getContainerDomNode())) return mounted[i].editor;
  }
  return null;
}

/** `version` as for `activeEditorIn`: read only changes bump it. */
export function isReadOnly(editor: CodeEditor, version: number): boolean {
  const entry = mounted.find((m) => m.editor === editor);
  return !entry || version < 0 || entry.editor.getOption(entry.monaco.editor.EditorOption.readOnly);
}

let coarse: MediaQueryList | null = null;
/** Touch first devices; shared by the toolbar, which re-renders on a change (devtools' touch emulation). */
export const coarsePointer = () => {
  coarse ??= window.matchMedia('(pointer: coarse)');
  return coarse;
};

/** Only the keys `phone` sets, copied, so restoring leaves the rest of a nested option alone. */
function pick(raw: EditorOptions, key: OptionKey, phone: unknown): unknown {
  const value = raw[key] as unknown;
  if (!phone || typeof phone !== 'object') return value;
  const source = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(Object.keys(phone).map((sub) => [sub, source[sub]]));
}

/**
 * Onmount handler for every Monaco editor. On a phone (touch, editor narrower than 768px) with `mobileEditor` on
 * it switches the options above in, and back out when the editor grows (rotation) or the option goes off.
 *
 * Core's file editor passes wordWrap, minimap and font size as props, which its editor wrapper hands to
 * `updateOptions` again (@monaco-editor/react up to panel 1.2.6 on every render, core's own wrapper from 1.2.7 when
 * the options object changes). So while the phone options are on, this editor's `updateOptions`
 * sees callers' options first: a value a caller repeats keeps the phone value, a changed one is the user's choice
 * in core's editor settings and stands (a font size only counts from 16px up). Nothing flips back and forth.
 */
export function mountMobileEditor(editor: CodeEditor, monaco: Monaco) {
  const entry: Mounted = { editor, monaco };
  mounted.push(entry);

  const { EditorOption } = monaco.editor;
  const phoneSet = phoneOptionsFor(monaco);
  const phoneKeys = Object.keys(phoneSet) as OptionKey[];
  const apply = editor.updateOptions.bind(editor);
  /** What callers last asked for instead of the phone options, restored when they go; null while they are off. */
  let asked: Record<string, unknown> | null = null;
  /** Keys a caller changed while the phone options were on: theirs stands, for the editor's lifetime. */
  const released = new Set<OptionKey>();

  editor.updateOptions = (options) => {
    if (!asked) return apply(options);
    const next: Record<string, unknown> = { ...options };

    for (const key of phoneKeys) {
      if (!(key in options)) continue;
      const value = pick(options, key, phoneSet[key]);
      if (JSON.stringify(value) !== JSON.stringify(asked[key])) released.add(key);
      asked[key] = value;
      if (released.has(key)) continue;
      const phone = phoneSet[key];
      next[key] = phone && typeof phone === 'object' ? { ...(options[key] as object), ...phone } : phone;
    }
    if (typeof options.fontSize === 'number') {
      asked.fontSize = options.fontSize;
      next.fontSize = Math.max(MIN_FONT_SIZE, options.fontSize);
    }

    apply(next as EditorOptions);
  };

  const wanted = () => {
    if (!currentTheme().mobileEditor || !coarsePointer().matches) return false;
    const width = editor.getContainerDomNode().offsetWidth;
    return width > 0 && width < PHONE_WIDTH;
  };

  const evaluate = () => {
    if (wanted() === !!asked) return;

    if (!asked) {
      const raw = editor.getRawOptions();
      const fontSize = Math.max(MIN_FONT_SIZE, editor.getOption(EditorOption.fontSize));
      const phone: Record<string, unknown> = { fontSize };
      asked = { fontSize: raw.fontSize };
      for (const key of phoneKeys) {
        asked[key] = pick(raw, key, phoneSet[key]);
        if (!released.has(key)) phone[key] = phoneSet[key];
      }
      apply(phone as EditorOptions);
    } else {
      const back: Record<string, unknown> = { fontSize: asked.fontSize };
      for (const key of phoneKeys) if (!released.has(key)) back[key] = asked[key];
      asked = null;
      apply(back as EditorOptions);
    }
  };

  const onMediaChange = () => {
    evaluate();
    notify();
  };
  coarsePointer().addEventListener('change', onMediaChange);
  const stopTheme = subscribeTheme(evaluate);

  const disposables = [
    editor.onDidLayoutChange(evaluate),
    editor.onDidChangeConfiguration((e) => {
      if (e.hasChanged(EditorOption.readOnly)) notify();
    }),
    editor.onDidFocusEditorWidget(() => {
      const at = mounted.indexOf(entry);
      if (at !== -1 && at !== mounted.length - 1) {
        mounted.splice(at, 1);
        mounted.push(entry);
      }
      notify();
    }),
  ];

  editor.onDidDispose(() => {
    for (const disposable of disposables) disposable.dispose();
    coarsePointer().removeEventListener('change', onMediaChange);
    stopTheme();
    const at = mounted.indexOf(entry);
    if (at !== -1) mounted.splice(at, 1);
    notify();
  });

  evaluate();
  notify();
}

/** The undo for "nothing was reserved". */
export const NOTHING_TO_UNDO = (): void => undefined;

/**
 * Keeps the bottom `px` of the editor (under the key row) clear: the last line can scroll above it and the
 * cursor keeps a few lines below it while typing. Returns the undo.
 */
export function reserveEditorBottom(editor: CodeEditor, px: number): () => void {
  const entry = mounted.find((m) => m.editor === editor);
  if (!entry) return NOTHING_TO_UNDO;

  const raw = editor.getRawOptions();
  const before: EditorOptions = {
    padding: { bottom: raw.padding?.bottom },
    cursorSurroundingLines: raw.cursorSurroundingLines,
  };
  const lineHeight = editor.getOption(entry.monaco.editor.EditorOption.lineHeight) || 20;
  editor.updateOptions({ padding: { bottom: px }, cursorSurroundingLines: Math.ceil(px / lineHeight) + 1 });

  return () => {
    if (mounted.includes(entry)) editor.updateOptions(before);
  };
}
