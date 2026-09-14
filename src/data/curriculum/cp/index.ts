import { CurriculumPhase, SchoolLevel } from '../types';
import { MasterCPEntry } from './types';
import { SD_CP_ENTRIES } from './sd';
import { SMP_CP_ENTRIES } from './smp';
import { SMA_CP_ENTRIES } from './sma';
import { findSubjectByNameOrAlias, findSubjectByCode } from '../subjects';

export * from './types';
export { SD_CP_ENTRIES } from './sd';
export { SMP_CP_ENTRIES } from './smp';
export { SMA_CP_ENTRIES } from './sma';

export const ALL_MASTER_CP_ENTRIES: MasterCPEntry[] = [
  ...SD_CP_ENTRIES,
  ...SMP_CP_ENTRIES,
  ...SMA_CP_ENTRIES,
];

/**
 * Cari Capaian Pembelajaran resmi berdasarkan mata pelajaran dan fase
 */
export function findCPBySubjectAndPhase(
  subjectCodeOrName: string,
  phase: CurriculumPhase
): MasterCPEntry | undefined {
  const subject =
    findSubjectByCode(subjectCodeOrName) || findSubjectByNameOrAlias(subjectCodeOrName);
  const code = subject ? subject.code : subjectCodeOrName.toUpperCase();

  return ALL_MASTER_CP_ENTRIES.find(
    (cp) => cp.subjectCode === code && cp.phase === phase
  );
}

/**
 * Ambil seluruh CP resmi berdasarkan jenjang
 */
export function getCPsByLevel(level: SchoolLevel): MasterCPEntry[] {
  return ALL_MASTER_CP_ENTRIES.filter((cp) => cp.level === level);
}
