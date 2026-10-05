import { TextInput } from '../../lib/core.ts';
import { urlValid } from '../../lib/editorDraft.ts';
import { useExtTranslations } from '../../translations.ts';

/**
 * An image or link URL field. A value normalizeTheme() would refuse is flagged here, since saving would
 * otherwise keep the old value without a word.
 */
export default function UrlInput({
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChange' | 'error'> & {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useExtTranslations();

  return (
    <TextInput
      placeholder='https://'
      {...props}
      value={value}
      error={urlValid(value) ? undefined : t('editor.urlInvalid', {})}
      onChange={(e) => onChange(e.target.value.trim())}
    />
  );
}
