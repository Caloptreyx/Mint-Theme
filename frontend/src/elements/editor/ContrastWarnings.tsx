import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert } from '@mantine/core';
import { Stack, Text } from '../../lib/core.ts';
import type { ContrastIssue } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';

/** The translated pieces of one issue; the ratio is floored so a pair just under the minimum never reads as meeting it. */
function useIssueParts() {
  const { t } = useExtTranslations();
  return {
    t,
    parts: (issue: ContrastIssue) => {
      const role = issue.role ? t(`editor.contrast.roles.${issue.role}`, {}) : '';
      const fg = t(`editor.${issue.fg}`, {});
      return {
        key: `${issue.fg}-${issue.bg}-${issue.role ?? ''}`,
        role,
        fg: role ? t('editor.contrast.named', { name: fg, role }) : fg,
        bg: t(`editor.${issue.bg}`, {}),
        numbers: { ratio: String(Math.floor(issue.ratio * 100) / 100), min: issue.min },
      };
    },
  };
}

/** Every failing pair at the top of the Colours section. */
export function ContrastSummary({ issues }: { issues: ContrastIssue[] }) {
  const { t, parts } = useIssueParts();
  if (!issues.length) return null;

  return (
    <Alert
      variant='light'
      color='yellow'
      icon={<FontAwesomeIcon icon={faTriangleExclamation} />}
      title={t('editor.contrast.title', {})}
    >
      <Text size='xs'>{t('editor.contrast.description', {})}</Text>
      <ul className='mt-1 list-disc pl-4 text-xs'>
        {issues.map((issue) => {
          const { key, fg, bg, numbers } = parts(issue);
          return <li key={key}>{t('editor.contrast.pair', { fg, bg, ...numbers })}</li>;
        })}
      </ul>
    </Alert>
  );
}

/** The failing pairs one colour input is part of, under that input, worded from its side. */
export function ContrastWarnings({ field, issues }: { field: string; issues: ContrastIssue[] }) {
  const { t, parts } = useIssueParts();
  const own = issues.filter((issue) => issue.fg === field || issue.bg === field);
  if (!own.length) return null;

  return (
    <Stack gap={2} mt={4}>
      {own.map((issue) => {
        const { key, role, fg, bg, numbers } = parts(issue);
        const message =
          issue.bg === field
            ? t('editor.contrast.low', { other: fg, ...numbers })
            : role
              ? t('editor.contrast.lowAs', { role, other: bg, ...numbers })
              : t('editor.contrast.low', { other: bg, ...numbers });
        return (
          <Text key={key} size='xs' className='flex items-baseline gap-1.5'>
            <FontAwesomeIcon icon={faTriangleExclamation} className='shrink-0 text-(--mantine-color-yellow-filled)' />
            <span>{message}</span>
          </Text>
        );
      })}
    </Stack>
  );
}
