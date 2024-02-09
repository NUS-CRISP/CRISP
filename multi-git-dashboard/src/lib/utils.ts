/**
 * Converts epoch time to a date string
 * @param epoch Epoch time
 * @returns Date string
 */
export const epochToDateString = (epoch: number) =>
  new Date(epoch * 1000).toLocaleDateString();

export const mergeDedupe = <T>(
  compareFn: (a: T, b: T) => boolean,
  ...arrays: T[][]
): T[] => {
  const combined: T[] = [];
  const set = new Set<T>();

  // Iterate through each array
  for (const arr of arrays) {
    // Iterate through each element in the array
    for (const item of arr) {
      // Check if the item is not in the set (to avoid duplicates) and matches the custom comparison function
      if (
        !set.has(item) &&
        !combined.some(existingItem => compareFn(existingItem, item))
      ) {
        combined.push(item);
        set.add(item);
      }
    }
  }

  return combined;
};
