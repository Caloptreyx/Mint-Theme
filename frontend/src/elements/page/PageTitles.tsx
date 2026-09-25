import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { Props } from '@/elements/containers/ServerContentContainer.tsx';
import Group from '@/elements/Group.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import { useTranslations } from '@/providers/TranslationProvider.tsx';
import { currentTheme } from '../../lib/apply.ts';

/** Core's title row without the title: the search box and the page's own buttons, on the right. */
function HeaderActions({ search, setSearch, contentRight }: Pick<Props, 'search' | 'setSearch' | 'contentRight'>) {
  const { t } = useTranslations();

  return (
    <Group justify='flex-end' mb='md'>
      {setSearch && (
        <TextInput
          placeholder={t('common.input.search', {})}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftSection={<FontAwesomeIcon icon={faSearch} />}
          w={250}
        />
      )}
      {contentRight}
    </Group>
  );
}

/**
 * Props interceptor for core's `ServerContentContainer` (every server page). With `pageTitles` off it hides the
 * title row and puts back the search box and buttons that shared it. Pages that already hide their title (Home,
 * Console) are left alone. The theme is read on render, so the preview applies it on the next page.
 */
export function hidePageTitle(props: Props): Props {
  if (props.hideTitleComponent || currentTheme().pageTitles) return props;
  const { search, setSearch, contentRight, children } = props;

  return {
    ...props,
    hideTitleComponent: true,
    children:
      setSearch || contentRight ? (
        <>
          <HeaderActions search={search} setSearch={setSearch} contentRight={contentRight} />
          {children}
        </>
      ) : (
        children
      ),
  };
}
