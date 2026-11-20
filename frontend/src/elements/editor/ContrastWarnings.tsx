import { faTriangleExclamation, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Alert, ColorSwatch } from '@mantine/core';
import type { ContrastIssue } from '../../lib/contrast.ts';
import type { NebulaTheme } from '../../lib/theme.ts';
import { Button, Group, Stack, Text, Tooltip } from '../../lib/core.ts';
import { useExtTranslations } from '../../translations.ts';

/** `fixContrast()` for each issue, in the same order; null where no colour of that field clears it. */
type Fixes = (Partial<NebulaTheme> | null)[];

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

/** Sets the issue's foreground field to the fixed colour, which it shows as a swatch and hex. */
function FixButton({
  issue,
  fix,
  onFix,
}: {
  issue: ContrastIssue;
  fix: Partial<NebulaTheme> | null;
  onFix: (patch: Partial<NebulaTheme>) => void;
}) {
  const { t } = useExtTranslations();
  const color = fix?.[issue.fg];
  if (!fix || !color) return null;

  return (
    <Tooltip
      label={t('editor.contrast.fixTitle', { field: t(`editor.${issue.fg}`, {}), color })}
      innerClassName='shrink-0'
    >
      <Button
        variant='light'
        color='gray'
        size='compact-xs'
        leftSection={<ColorSwatch color={color} size={10} withShadow={false} />}
        onClick={() => onFix(fix)}
      >
        {t('editor.contrast.fix', { color })}
      </Button>
    </Tooltip>
  );
}

/** Every failing pair at the top of the Colours section, with 'Fix all' while `fixAll` changes anything. */
export function ContrastSummary({
  issues,
  fixes,
  fixAll,
  onFix,
}: {
  issues: ContrastIssue[];
  fixes: Fixes;
  fixAll: Partial<NebulaTheme>;
  onFix: (patch: Partial<NebulaTheme>) => void;
}) {
  const { t, parts } = useIssueParts();
  if (!issues.length) return null;

  return (
    <Alert
      variant='light'
      color='yellow'
      icon={<FontAwesomeIcon icon={faTriangleExclamation} />}
      title={t('editor.contrast.title', {})}
    >
      <Group justify='space-between' wrap='nowrap' align='flex-start'>
        <Text size='xs'>{t('editor.contrast.description', {})}</Text>
        {Object.keys(fixAll).length > 0 && (
          <Tooltip label={t('editor.contrast.fixAllTitle', {})} innerClassName='shrink-0'>
            <Button
              variant='light'
              color='yellow'
              size='compact-xs'
              leftSection={<FontAwesomeIcon icon={faWandMagicSparkles} />}
              onClick={() => onFix(fixAll)}
            >
              {t('editor.contrast.fixAll', {})}
            </Button>
          </Tooltip>
        )}
      </Group>
      <ul className='mt-1 list-disc pl-4 text-xs'>
        {issues.map((issue, i) => {
          const { key, fg, bg, numbers } = parts(issue);
          return (
            <li key={key}>
              <span className='inline-flex flex-wrap items-baseline gap-1.5'>
                <span>{t('editor.contrast.pair', { fg, bg, ...numbers })}</span>
                <FixButton issue={issue} fix={fixes[i]} onFix={onFix} />
              </span>
            </li>
          );
        })}
      </ul>
    </Alert>
  );
}

/** The failing pairs one colour input is part of, under that input, worded from its side. */
export function ContrastWarnings({
  field,
  issues,
  fixes,
  onFix,
}: {
  field: string;
  issues: ContrastIssue[];
  fixes: Fixes;
  onFix: (patch: Partial<NebulaTheme>) => void;
}) {
  const { t, parts } = useIssueParts();
  const own = issues
    .map((issue, i) => ({ issue, fix: fixes[i] }))
    .filter(({ issue }) => issue.fg === field || issue.bg === field);
  if (!own.length) return null;

  return (
    <Stack gap={2} mt={4}>
      {own.map(({ issue, fix }) => {
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
            <FixButton issue={issue} fix={fix} onFix={onFix} />
          </Text>
        );
      })}
    </Stack>
  );
}
