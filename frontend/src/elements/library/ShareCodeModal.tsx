import { useEffect, useState } from 'react';
import type { NebulaTheme } from '../../lib/theme.ts';
import { Button, Group, Modal, ModalFooter, Stack, Text, TextArea } from '../../lib/core.ts';
import { normalizeTheme } from '../../lib/normalize.ts';
import { decodeShareCode, encodeShareCode, MAX_SHARE_INPUT } from '../../lib/shareCode.ts';
import { useExtTranslations } from '../../translations.ts';
import Swatches from './Swatches.tsx';

/** `theme`'s share code, or null while it is being encoded (and for a moment after `theme` changes). */
export function useShareCode(theme: Partial<NebulaTheme>): string | null {
  const [encoded, setEncoded] = useState<{ theme: Partial<NebulaTheme>; code: string } | null>(null);

  useEffect(() => {
    let live = true;
    encodeShareCode(theme)
      .then((code) => {
        if (live) setEncoded({ theme, code });
      })
      .catch(() => {
        // CompressionStream is in every browser the panel supports; without it there is simply no code
      });
    return () => {
      live = false;
    };
  }, [theme]);

  // a code made for an earlier theme is never handed out
  return encoded?.theme === theme ? encoded.code : null;
}

/**
 * 'Paste share code': a code or a link holding one, decoded live, its colours shown before `onApply` gets the look.
 * The look is unchecked; the caller lays it over the draft through normalizeTheme.
 */
export default function ShareCodeModal({
  opened,
  initial,
  onClose,
  onApply,
}: {
  opened: boolean;
  /** Prefills the text (a share link the editor was opened with). */
  initial: string;
  onClose: () => void;
  onApply: (look: Partial<NebulaTheme>) => void;
}) {
  const { t } = useExtTranslations();
  const [text, setText] = useState(initial);
  // the look decoded from `text`, null when it holds no valid code
  const [decoded, setDecoded] = useState<{ text: string; look: Partial<NebulaTheme> | null } | null>(null);

  useEffect(() => {
    if (opened) setText(initial);
  }, [opened, initial]);

  useEffect(() => {
    let live = true;
    decodeShareCode(text).then((look) => {
      if (live) setDecoded({ text, look });
    });
    return () => {
      live = false;
    };
  }, [text]);

  // undefined while `text` is still being decoded
  const look = decoded?.text === text ? decoded.look : undefined;
  const apply = () => {
    if (!look) return;
    onApply(look);
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={t('share.pasteTitle', {})}>
      <Stack gap='sm'>
        <Text size='sm' c='dimmed'>
          {t('share.pasteDescription', {})}
        </Text>
        <TextArea
          label={t('share.codeLabel', {})}
          placeholder='mint1.…'
          value={text}
          maxLength={MAX_SHARE_INPUT}
          autosize
          minRows={3}
          maxRows={8}
          spellCheck={false}
          data-autofocus
          classNames={{ input: 'font-mono' }}
          error={text.trim() && look === null ? t('share.invalid', {}) : undefined}
          onChange={(e) => setText(e.currentTarget.value)}
        />
        {look && (
          <Group justify='space-between' wrap='nowrap'>
            <Text size='sm'>{t('share.preview', {})}</Text>
            {/* the swatches paint the values, so they get checked ones: a code may carry anything */}
            <Swatches theme={normalizeTheme(look)} />
          </Group>
        )}
      </Stack>
      <ModalFooter>
        <Button disabled={!look} onClick={apply}>
          {t('share.apply', {})}
        </Button>
        <Button variant='default' onClick={onClose}>
          {t('share.cancel', {})}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
