/**
 * src/utils/driverTime.js
 *
 * Provides a helper to translate raw driving duration into wall-clock time
 * including legally required breaks for truck drivers:
 *   • 4.5h driving → 45min break → 4.5h driving → 11h break, repeat...
 */

/**
 * Given a raw driving time in seconds, injects the required breaks:
 *   • 4.5h drive (16 200s)
 *   • 0.75h break (2 700s)
 *   • 4.5h drive (16 200s)
 *   • 11h break (39 600s)
 * repeat...
 *
 * @param {number} driveSec - total raw driving seconds
 * @returns {number} wall-clock seconds including breaks
 */
export function addLegalBreaks(driveSec) {
  const FIRST_DRIVE = 4.5 * 3600;   // 16 200s
  const SHORT_BREAK = 0.75 * 3600;  // 2 700s
  const SECOND_DRIVE= 4.5 * 3600;   // 16 200s
  const LONG_BREAK  = 11 * 3600;    // 39 600s

  const cycleDrive = FIRST_DRIVE + SECOND_DRIVE; // 32 400s
  const cycleBreak = SHORT_BREAK + LONG_BREAK;   // 42 300s

  // full 9h driving chunks
  const fullCycles = Math.floor(driveSec / cycleDrive);
  // driving time + breaks for each full cycle
  let totalSec = driveSec + fullCycles * cycleBreak;

  // remainder after full cycles
  const remainder = driveSec - fullCycles * cycleDrive;

  // if remainder exceeds first driving segment, add the 45min short break
  if (remainder > FIRST_DRIVE) {
    totalSec += SHORT_BREAK;
    // the 11h break only applies when starting next 4.5h segment,
    // which is covered by fullCycles logic
  }

  return totalSec;
}
