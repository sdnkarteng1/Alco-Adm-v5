import {
  CurriculumPhase,
  CurriculumType,
  ResolvedCurriculumContext,
  SchoolLevel,
} from './types';
import { ALL_CURRICULUM_STRUCTURE_RULES } from './structure';
import {
  findSubjectByCode,
  findSubjectByNameOrAlias,
  CURRICULUM_SUBJECTS,
} from './subjects';
import { getRegulationSources } from './regulations';

/**
 * Pemetaan resmi Kelas ke Fase Kurikulum Merdeka (BSKAP No. 032/H/KR/2024 & Permendikbudristek 12/2024)
 */
export function getPhaseForGrade(grade: number): CurriculumPhase | undefined {
  if (grade === 1 || grade === 2) return 'A';
  if (grade === 3 || grade === 4) return 'B';
  if (grade === 5 || grade === 6) return 'C';
  if (grade === 7 || grade === 8 || grade === 9) return 'D';
  if (grade === 10) return 'E';
  if (grade === 11 || grade === 12) return 'F';
  return undefined;
}

/**
 * Pemetaan resmi Jenjang Sekolah berdasarkan Kelas
 */
export function getSchoolLevelForGrade(grade: number): SchoolLevel {
  if (grade >= 1 && grade <= 6) return 'SD';
  if (grade >= 7 && grade <= 9) return 'SMP';
  return 'SMA';
}

export interface ResolveCurriculumParams {
  curriculumType?: CurriculumType;
  grade: number;
  subjectInput: string;
  schoolWeeksPerYear?: number;
}

/**
 * RESOLVER UTAMA KURIKULUM NASIONAL
 *
 * Menggabungkan Master Mata Pelajaran, Master Struktur JP, Pemetaan Fase,
 * dan Master Regulasi Resmi menjadi satu konteks utuh yang siap dikonsumsi oleh:
 * - jpEngine
 * - PROTA / PROMES
 * - Kalender Akademik
 * - Perencanaan Pembelajaran
 */
export function resolveCurriculumContext(
  params: ResolveCurriculumParams
): ResolvedCurriculumContext | null {
  const {
    curriculumType = 'KURIKULUM_MERDEKA',
    grade,
    subjectInput,
    schoolWeeksPerYear,
  } = params;

  if (!grade || !subjectInput) return null;

  // 1. Resolve Subject
  const subject =
    findSubjectByCode(subjectInput) || findSubjectByNameOrAlias(subjectInput);

  if (!subject) {
    return null;
  }

  // 2. Find Structure Rule
  const level = getSchoolLevelForGrade(grade);
  const matchedRule = ALL_CURRICULUM_STRUCTURE_RULES.find(
    (rule) =>
      rule.grade === grade &&
      rule.subjectCode === subject.code &&
      (rule.curriculumType === curriculumType || !rule.curriculumType)
  );

  if (!matchedRule) {
    return null;
  }

  // 3. Resolve Regulation Sources
  const regulationSources = getRegulationSources(matchedRule.regulationIds);

  // 4. Hitung perbedaan antara JP Normatif vs JP Aktual Sekolah
  // Rumus JP Tersedia Aktual: (Minggu Efektif Sekolah) * (JP Ekuivalen Mingguan)
  const effectiveWeeks = schoolWeeksPerYear && schoolWeeksPerYear > 0
    ? schoolWeeksPerYear
    : matchedRule.referenceWeeksPerYear;

  const actualAvailableAnnualJP = effectiveWeeks * matchedRule.derivedWeeklyJP;
  const phase = matchedRule.phase || getPhaseForGrade(grade) || 'A';

  return {
    level,
    grade,
    phase,
    subject,
    structureRule: matchedRule,
    rule: matchedRule,
    regulationSources,
    verificationStatus: matchedRule.verificationStatus,
    intrakurikulerAnnualJP: matchedRule.intrakurikulerAnnualJP,
    kokurikulerAnnualJP: matchedRule.kokurikulerAnnualJP,
    totalAnnualJP: matchedRule.totalAnnualJP,
    referenceWeeksPerYear: matchedRule.referenceWeeksPerYear,
    minutesPerJP: matchedRule.minutesPerJP,
    derivedWeeklyJP: matchedRule.derivedWeeklyJP,
    actualAvailableAnnualJP,
    isElective: matchedRule.subjectType === 'ELECTIVE' || matchedRule.subjectType === 'LOCAL_CONTENT',
    effectivePhase: phase,
    isOfficial: matchedRule.verificationStatus === 'VERIFIED',
    explanation: `Alokasi resmi: ${matchedRule.derivedWeeklyJP} JP/minggu (${matchedRule.intrakurikulerAnnualJP} JP intrakurikuler/tahun) berdasarkan ${regulationSources[0]?.title || 'Regulasi Resmi'}.`,
  };
}

/**
 * Mengambil seluruh aturan kurikulum untuk kelas dan kurikulum tertentu
 */
export function getStructureRulesForGrade(
  grade: number,
  curriculumType: CurriculumType = 'KURIKULUM_MERDEKA'
) {
  return ALL_CURRICULUM_STRUCTURE_RULES.filter(
    (rule) => rule.grade === grade && rule.curriculumType === curriculumType
  );
}

/**
 * Mengambil daftar mata pelajaran yang aktif pada kelas tertentu
 */
export function getSubjectsForGrade(
  grade: number,
  curriculumType: CurriculumType = 'KURIKULUM_MERDEKA'
) {
  const rules = getStructureRulesForGrade(grade, curriculumType);
  const subjectCodes = new Set(rules.map((r) => r.subjectCode));
  return CURRICULUM_SUBJECTS.filter((s) => subjectCodes.has(s.code));
}
