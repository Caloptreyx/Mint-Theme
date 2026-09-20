import Text from '@/elements/Text.tsx';
import { useServerStore } from '@/stores/server.ts';

export default function EggLabel() {
  const egg = useServerStore((s) => s.server.egg.name);

  return (
    <Text size='xs' fw={700} tt='uppercase' c='var(--nebula-highlight)' className='tracking-wider'>
      {egg}
    </Text>
  );
}
