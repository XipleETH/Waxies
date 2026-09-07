/** Authored routes, rather than repeating one sine wave for all five regions. */
export const storyMapStep = (chapter: number) => 5.4 + chapter * 0.65;
export const storyMapHeight = (chapter: number) =>
  Math.round((1540 * storyMapStep(chapter)) / 5.4);
export const REGION_PATHS = [
  [-2.1, -0.5, 2.2, 2.4, 0.4, -2.2, -1.5, 1.3, 2.1, 0],
  [1.9, 2.1, 0.8, -1.7, -2.2, -0.8, 1.8, 0.4, -1.7, -0.3],
  [0, -2.3, 0.3, 2.2, -0.2, -2.1, 0.2, 2.3, 0.8, -1.5],
  [-2.2, -2, 0.9, 2.2, 2, -0.6, -2.1, -0.9, 1.6, 1.9],
  [0, 2.1, 1.1, -1.8, -2.2, 0.4, 2.2, 0.6, -1.9, 0],
] as const;
export function storyMapNodes(chapter: number) {
  return REGION_PATHS[chapter].map((x, i) => ({
    x,
    z:
      i * storyMapStep(chapter) +
      (i > 0 && i < 9 ? Math.sin(i * (chapter + 1)) * 0.35 : 0),
  }));
}
export function dungeonMapSize(number: number, traps: number) {
  return {
    width: 0.76 + ((number - 1) / 49) * 0.3 + (traps - 1) * 0.035,
    height: 0.72 + ((number - 1) / 49) * 0.62 + (traps - 1) * 0.045,
  };
}
