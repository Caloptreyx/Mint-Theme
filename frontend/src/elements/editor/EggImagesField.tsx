import { useEffect, useState } from 'react';
import { getAllEggs, Select, Stack, Text } from '../../lib/core.ts';
import type { EggImages, NebulaTheme } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import UrlInput from './UrlInput.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

type EggGroup = { group: string; items: { value: string; label: string }[] };

export default function EggImagesField({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const [groups, setGroups] = useState<EggGroup[]>([]);
  const [egg, setEgg] = useState<string | null>(null);

  useEffect(() => {
    getAllEggs()
      .then((nests) => {
        const next = nests.map(({ nest, eggs }) => ({
          group: nest.name,
          items: eggs.map((e) => ({ value: e.uuid, label: e.name })),
        }));
        setGroups(next);
        setEgg(next[0]?.items[0]?.value ?? null);
      })
      .catch(() => {
        // without the egg list the field stays empty, the rest of the editor still works
      });
  }, []);

  const current: EggImages = (egg && theme.eggs[egg]) || { banner: '', icon: '' };
  const update = (patch: Partial<EggImages>) => {
    if (egg) set({ eggs: { ...theme.eggs, [egg]: { ...current, ...patch } } });
  };

  return (
    <Stack gap='xs'>
      <div>
        <Text size='sm' fw={600}>
          {t('editor.eggImages', {})}
        </Text>
        <Text size='xs' c='dimmed'>
          {t('editor.eggImagesDescription', {})}
        </Text>
      </div>
      <Select label={t('editor.egg', {})} data={groups} value={egg} onChange={setEgg} searchable />
      {egg && (
        <>
          <UrlInput
            label={t('editor.eggBanner', {})}
            value={current.banner}
            onChange={(banner) => update({ banner })}
          />
          <UrlInput
            label={t('editor.eggIcon', {})}
            value={current.icon}
            leftSection={current.icon && <img src={current.icon} alt='' className='size-5 rounded-sm object-cover' />}
            onChange={(icon) => update({ icon })}
          />
        </>
      )}
    </Stack>
  );
}
