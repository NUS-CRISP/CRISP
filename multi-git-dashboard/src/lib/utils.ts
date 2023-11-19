/**
 * Adds a delay to function execution (remember to await)
 * @param ms Number of milliseconds to delay
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Converts epoch time to a date string
 * @param epoch Epoch time
 * @returns Date string
 */
const epochToDateString = (epoch: number) =>
  new Date(epoch * 1000).toLocaleDateString();

export { delay, epochToDateString };
