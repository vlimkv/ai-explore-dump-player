export function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
