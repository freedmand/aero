export function rpmToWatts(rpm: number) {
  if (rpm <= 0) return 0;
  return 0.0006 * rpm * rpm * rpm + 0.005 * rpm * rpm + 0.2583 * rpm + 6;
}

const SCALING_FACTOR = 1.14174581282;

export function wattsToMps(watts: number) {
  watts /= SCALING_FACTOR;
  return (
    0.015711509930705227 * watts -
    0.000006408078187192426 * watts * watts +
    9.01993744920797e-10 * watts * watts * watts
  );
}

export function mpsToRpm(mps: number) {
  return (
    -26.6886 * Math.pow(mps, 2.0361e-16) + 65.1635 * Math.pow(mps, 0.304912)
  );
}

export function milePaceToMps(milePace: number) {
  return 26.8224 / milePace;
}

export function getDistance(pedalDelta: number, gearRatio: number) {
  const rpm = 60 / pedalDelta / gearRatio;
  const watts = rpmToWatts(rpm);
  const mps = wattsToMps(watts);
  return mps * pedalDelta;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
