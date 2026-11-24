export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

/** Minimum viewport width per preview device; desktop expands to fill wider stages at 1:1. */
export const DEVICE_WIDTH: Record<PreviewDevice, number> = {
  desktop: 1280,
  tablet: 834,
  mobile: 390,
};

export const STAGE_PADDING = 24;

export interface PreviewViewport {
  stagePadding: number;
  logicalWidth: number;
  logicalHeight: number;
  scale: number;
}

/**
 * Computes the preview iframe's logical size and CSS scale factor.
 * Desktop uses at least 1280px so the embedded panel stays in its desktop breakpoint even when the 3-pane editor
 * narrows the preview stage, scaling down smoothly to fit the available width.
 */
export function previewViewport(
  device: PreviewDevice,
  stage: { width: number; height: number },
  wide: boolean,
): PreviewViewport {
  const stagePadding = wide ? STAGE_PADDING : 8;
  const available = Math.max(wide ? 320 : 200, stage.width - stagePadding * 2);
  const logicalWidth = device === 'desktop' ? Math.max(DEVICE_WIDTH.desktop, available) : DEVICE_WIDTH[device];
  const scale = Math.min(1, available / logicalWidth);
  const logicalHeight = Math.max(320, stage.height - stagePadding * 2) / scale;
  return { stagePadding, logicalWidth, logicalHeight, scale };
}
