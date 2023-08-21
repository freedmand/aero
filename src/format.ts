export function formatTime(time: number, padSeconds = false) {
  // Return s.cs
  const m = Math.floor(time / 60);
  if (m > 0) {
    return `${m}:${formatTime(time % 60, true)}`;
  }
  const seconds = Math.floor(time);
  // If padSeconds, ensure seconds is 2 digits
  let s: string;
  if (padSeconds && seconds < 10) {
    s = `0${seconds}`;
  } else {
    s = `${seconds}`;
  }

  const centis = Math.floor((time % 1) * 100);
  // Ensure cs is 2 digits
  let cs: string;
  if (centis < 10) {
    cs = `0${centis}`;
  } else {
    cs = `${centis}`;
  }
  return `${s}.${cs}`;
}
