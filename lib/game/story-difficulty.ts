/** Published story progression. Room numbers remain stable when hazards are rebalanced. */
export function storyTrapCount(number: number) {
  if (!Number.isInteger(number) || number < 1 || number > 50)
    throw Error('Nivel de historia inválido.');
  return number <= 3
    ? 1
    : number <= 10
      ? 2
      : number <= 25
        ? 3
        : number <= 40
          ? 4
          : 5;
}
