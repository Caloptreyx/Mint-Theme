import { useEffect, useState } from 'react';
import getAllEggs from '@/api/admin/nests/getAllEggs.ts';
import Select from '@/elements/input/Select.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import Stack from '@/elements/Stack.tsx';
import Text from '@/elements/Text.tsx';
import type { EggImages, NebulaTheme } from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';

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
          <TextInput
            label={t('editor.eggBanner', {})}
            placeholder='https://'
            value={current.banner}
            onChange={(e) => update({ banner: e.target.value.trim() })}
          />
          <TextInput
            label={t('editor.eggIcon', {})}
            placeholder='https://'
            value={current.icon}
            leftSection={current.icon && <img src={current.icon} alt='' className='size-5 rounded-sm object-cover' />}
            onChange={(e) => update({ icon: e.target.value.trim() })}
          />
        </>
      )}
    </Stack>
  );
}
