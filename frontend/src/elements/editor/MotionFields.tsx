import type { CSSProperties } from 'react';
import { Stack, Switch } from '../../lib/core.ts';
import {
  ANIMATION_SPEED_FACTORS,
  ANIMATION_SPEEDS,
  CARD_ANIMATIONS,
  CARD_ENTRANCES,
  CARD_STAGGER_MS,
  type CardEntrance,
  CLICK_EFFECTS,
  HOVER_EFFECTS,
  type HoverEffect,
  type NebulaTheme,
  OVERLAY_ANIMATIONS,
  OVERLAY_MOTIONS,
  type OverlayMotion,
  PAGE_ANIMATIONS,
  PAGE_TRANSITIONS,
  type PageTransition,
} from '../../lib/theme.ts';
import { useExtTranslations } from '../../translations.ts';
import ChoiceCards from './ChoiceCards.tsx';
import { ClickMock } from './StyleMocks.tsx';

interface Props {
  theme: NebulaTheme;
  set: (patch: Partial<NebulaTheme>) => void;
}

// The tiles play each animation three times slower than the panel does, so it reads at this size, and at the
// draft's speed (`factor`). `motion-safe` keeps them still under reduced motion.
const SLOWER = 3;

const mock = (animation: string): CSSProperties => ({ '--nebula-mock': animation }) as CSSProperties;

/** A page beside the sidebar; hovering plays the transition on the page. */
function TransitionMock({ transition, factor }: { transition: PageTransition; factor: number }) {
  const animation = transition === 'none' ? null : PAGE_ANIMATIONS[transition];

  return (
    <div className='group/page flex size-full gap-1'>
      <span className='w-4 shrink-0 rounded-sm bg-(--nebula-card)' />
      <div
        className={`flex flex-1 flex-col gap-1 ${animation ? 'motion-safe:group-hover/page:animate-(--nebula-mock)' : ''}`}
        style={
          animation ? mock(`${animation.keyframes} ${animation.ms * SLOWER * factor}ms ${animation.easing}`) : undefined
        }
      >
        <span className='h-1.5 w-1/2 rounded-full bg-(--mantine-color-text)' />
        <span className='flex-1 rounded-sm bg-(--nebula-card)' />
        <span className='flex-1 rounded-sm bg-(--nebula-card)' />
      </div>
    </div>
  );
}

/** Three cards that come in one after another on hover. */
function CardsMock({ entrance, factor }: { entrance: CardEntrance; factor: number }) {
  const animation = entrance === 'none' ? null : CARD_ANIMATIONS[entrance];

  return (
    <div className='group/cards grid size-full grid-cols-3 gap-1'>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={`flex flex-col justify-end gap-0.5 rounded-sm border border-(--mantine-color-default-border) bg-(--nebula-card) p-1 ${
            animation ? 'motion-safe:group-hover/cards:animate-(--nebula-mock)' : ''
          }`}
          style={
            animation
              ? mock(
                  `${animation.keyframes} ${animation.ms * SLOWER * factor}ms ${animation.easing} ${
                    index * CARD_STAGGER_MS * SLOWER * factor
                  }ms backwards`,
                )
              : undefined
          }
        >
          <span className='h-1 w-3/4 rounded-full bg-(--mantine-color-text)' />
          <span className='h-1 w-1/2 rounded-full bg-(--mantine-color-dimmed)' />
        </span>
      ))}
    </div>
  );
}

const CARD_HOVER: Record<HoverEffect, string> = {
  none: '',
  lift: 'motion-safe:group-hover/hover:-translate-y-1 group-hover/hover:shadow-lg',
  glow: 'group-hover/hover:shadow-[0_0_0_1px_var(--mantine-color-blue-filled),0_0_14px_-2px_var(--mantine-color-blue-filled)]',
};

const BUTTON_HOVER: Record<HoverEffect, string> = {
  none: '',
  lift: 'motion-safe:group-hover/hover:-translate-y-0.5 group-hover/hover:shadow-md',
  glow: 'group-hover/hover:shadow-[0_0_0_1px_var(--mantine-color-blue-filled),0_0_10px_-1px_var(--mantine-color-blue-filled)]',
};

/** A server card and a button, shown hovered while the pointer is on the tile. */
function HoverMock({ effect }: { effect: HoverEffect }) {
  return (
    <div className='group/hover flex size-full items-center gap-2'>
      <div
        className={`flex h-full flex-1 flex-col justify-center gap-1 rounded-(--mantine-radius-md) border border-(--mantine-color-default-border) bg-(--nebula-card) px-2 transition-[translate,box-shadow] duration-300 motion-reduce:transition-none ${CARD_HOVER[effect]}`}
      >
        <span className='h-1 w-3/4 rounded-full bg-(--mantine-color-text)' />
        <span className='h-1 w-1/2 rounded-full bg-(--mantine-color-dimmed)' />
      </div>
      <span
        className={`h-4 w-8 shrink-0 rounded-(--mantine-radius-sm) bg-(--mantine-color-blue-filled) transition-[translate,box-shadow] duration-300 motion-reduce:transition-none ${BUTTON_HOVER[effect]}`}
      />
    </div>
  );
}

/** A dialog over a dimmed page; hovering opens it the chosen way. */
function OverlayMock({ motion, factor }: { motion: OverlayMotion; factor: number }) {
  const animation = motion === 'none' ? null : OVERLAY_ANIMATIONS[motion];

  return (
    <div className='group/overlay relative flex size-full items-center justify-center rounded-sm bg-(--nebula-card)'>
      <span className='absolute inset-0 rounded-sm bg-black/35' />
      <div
        className={`relative flex w-3/5 flex-col gap-1 rounded-(--mantine-radius-sm) bg-(--mantine-color-body) p-1.5 shadow-md ${
          animation ? 'motion-safe:group-hover/overlay:animate-(--nebula-mock)' : ''
        }`}
        style={
          animation
            ? ({
                ...mock(`${animation.keyframes} ${animation.ms * SLOWER * factor}ms ${animation.easing}`),
                '--nebula-overlay-shift': '8px',
              } as CSSProperties)
            : undefined
        }
      >
        <span className='h-1 w-1/2 rounded-full bg-(--mantine-color-text)' />
        <span className='h-1 w-3/4 rounded-full bg-(--mantine-color-dimmed)' />
        <span className='h-2 w-5 self-end rounded-sm bg-(--mantine-color-blue-filled)' />
      </div>
    </div>
  );
}

/** Page transitions, card entrance, hover and click effects, overlays, the animation speed and reduce motion. */
export default function MotionFields({ theme, set }: Props) {
  const { t } = useExtTranslations();
  const factor = ANIMATION_SPEED_FACTORS[theme.animationSpeed];
  // the speed tiles play the chosen page transition, or one that moves when there is none
  const sample: PageTransition = theme.pageTransition === 'none' ? 'fadeUp' : theme.pageTransition;

  return (
    <Stack gap='lg'>
      <ChoiceCards
        label={t('editor.interface.pageTransition', {})}
        description={t('editor.interface.pageTransitionDescription', {})}
        value={theme.pageTransition}
        choices={PAGE_TRANSITIONS.map((transition) => ({
          value: transition,
          label: t(`editor.interface.transitions.${transition}`, {}),
          preview: <TransitionMock transition={transition} factor={factor} />,
        }))}
        onChange={(pageTransition) => set({ pageTransition })}
      />
      <ChoiceCards
        label={t('editor.motion.cardEntrance', {})}
        description={t('editor.motion.cardEntranceDescription', {})}
        value={theme.cardEntrance}
        columns={3}
        choices={CARD_ENTRANCES.map((entrance) => ({
          value: entrance,
          label: t(`editor.motion.cardEntrances.${entrance}`, {}),
          preview: <CardsMock entrance={entrance} factor={factor} />,
        }))}
        onChange={(cardEntrance) => set({ cardEntrance })}
      />
      <ChoiceCards
        label={t('editor.motion.hoverEffect', {})}
        description={t('editor.motion.hoverEffectDescription', {})}
        value={theme.hoverEffect}
        columns={3}
        choices={HOVER_EFFECTS.map((effect) => ({
          value: effect,
          label: t(`editor.motion.hovers.${effect}`, {}),
          preview: <HoverMock effect={effect} />,
        }))}
        onChange={(hoverEffect) => set({ hoverEffect })}
      />
      <ChoiceCards
        label={t('editor.elements.clickEffect', {})}
        description={t('editor.elements.clickEffectDescription', {})}
        value={theme.clickEffect}
        choices={CLICK_EFFECTS.map((effect) => ({
          value: effect,
          label: t(`editor.elements.click.${effect}`, {}),
          preview: <ClickMock effect={effect} label={t('editor.elements.create', {})} />,
        }))}
        onChange={(clickEffect) => set({ clickEffect })}
      />
      <ChoiceCards
        label={t('editor.motion.overlayMotion', {})}
        description={t('editor.motion.overlayMotionDescription', {})}
        value={theme.overlayMotion}
        choices={OVERLAY_MOTIONS.map((motion) => ({
          value: motion,
          label: t(`editor.motion.overlays.${motion}`, {}),
          preview: <OverlayMock motion={motion} factor={factor} />,
        }))}
        onChange={(overlayMotion) => set({ overlayMotion })}
      />
      <ChoiceCards
        label={t('editor.motion.animationSpeed', {})}
        description={t('editor.motion.animationSpeedDescription', {})}
        value={theme.animationSpeed}
        columns={3}
        choices={ANIMATION_SPEEDS.map((speed) => ({
          value: speed,
          label: t(`editor.motion.speeds.${speed}`, {}),
          preview: <TransitionMock transition={sample} factor={ANIMATION_SPEED_FACTORS[speed]} />,
        }))}
        onChange={(animationSpeed) => set({ animationSpeed })}
      />
      <Switch
        label={t('editor.motion.reduceMotion', {})}
        description={t('editor.motion.reduceMotionDescription', {})}
        checked={theme.reduceMotion}
        onChange={(e) => set({ reduceMotion: e.currentTarget.checked })}
      />
    </Stack>
  );
}
