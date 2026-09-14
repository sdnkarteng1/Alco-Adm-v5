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
  academicYear?: string;
  level?: SchoolLevel | string;
  grade: number;
  subjectCode?: string;
  subjectInput?: string;
  schoolWeeksPerYear?: number;
  actualWeeksProvenance?: 'CALENDAR' | 'MANUAL_VALIDATED';
  actualWeeklyJP?: number;
  actualScheduledAnnualJP?: number;
  weeklyJPSource?: 'ACTUAL_SCHEDULE' | 'REFERENCE_EQUIVALENT';
}

export interface ParsedAcademicYear {
  startYear: number;
  endYear: number;
  startDate: string;
  endDate: string;
}

/**
 * Deterministik Academic Year Parser standar kalender pendidikan nasional
 * Contoh format: "2024/2025", "2025/2026", "2024-2025", "2025"
 * Standar: Dimulai 1 Juli tahun n s/d 30 Juni tahun n+1
 */
export function parseAcademicYear(academicYear?: string): ParsedAcademicYear | null {
  if (!academicYear || typeof academicYear !== 'string') return null;
  const cleaned = academicYear.trim();

  const matchSlash = cleaned.match(/^(\d{4})\s*[/–-]\s*(\d{4})$/);
  if (matchSlash) {
    const startYear = parseInt(matchSlash[1], 10);
    const endYear = parseInt(matchSlash[2], 10);
    return {
      startYear,
      endYear,
      startDate: `${startYear}-07-01`,
      endDate: `${endYear}-06-30`,
    };
  }

  const matchSingle = cleaned.match(/^(\d{4})$/);
  if (matchSingle) {
    const startYear = parseInt(matchSingle[1], 10);
    const endYear = startYear + 1;
    return {
      startYear,
      endYear,
      startDate: `${startYear}-07-01`,
      endDate: `${endYear}-06-30`,
    };
  }

  return null;
}

export function resolveAcademicYearStartDate(academicYear?: string): string | null {
  const parsed = parseAcademicYear(academicYear);
  return parsed ? parsed.startDate : null;
}

export function resolveAcademicStartYear(academicYear?: string): number | null {
  const parsed = parseAcademicYear(academicYear);
  return parsed ? parsed.startYear : null;
}

/**
 * RESOLVER UTAMA KURIKULUM NASIONAL
 *
 * Menggabungkan Master Mata Pelajaran, Master Struktur JP, Pemetaan Fase,
 * dan Master Regulasi Resmi menjadi satu konteks utuh yang sensitif tahun ajaran (version-aware)
 * dan memisahkan tegas JP Normatif Regulasi dengan JP Tersedia Aktual Sekolah.
 */
export function resolveCurriculumContext(
  params: ResolveCurriculumParams
): ResolvedCurriculumContext | null {
  const {
    curriculumType = 'KURIKULUM_MERDEKA',
    academicYear,
    level: inputLevel,
    grade,
    subjectCode,
    subjectInput,
    schoolWeeksPerYear,
    actualWeeksProvenance,
  } = params;

  if (!grade) return null;
  const rawSubject = subjectCode || subjectInput;
  if (!rawSubject) return null;

  // 1. Resolve Subject
  const subject =
    (subjectCode ? findSubjectByCode(subjectCode) : null) ||
    findSubjectByCode(rawSubject) ||
    findSubjectByNameOrAlias(rawSubject);

  if (!subject) {
    return null;
  }

  // 2. Filter Candidate Rules
  const level = getSchoolLevelForGrade(grade);
  const targetLevel = inputLevel ? String(inputLevel).toUpperCase() : level;

  const baseCandidates = ALL_CURRICULUM_STRUCTURE_RULES.filter(
    (rule) =>
      rule.grade === grade &&
      rule.subjectCode === subject.code &&
      (rule.curriculumType === curriculumType || !rule.curriculumType) &&
      (!targetLevel || rule.level === targetLevel)
  );

  if (baseCandidates.length === 0) {
    return null;
  }

  // 3. Period & Academic Year Filtering
  const parsedAY = parseAcademicYear(academicYear);
  let matchingRules = baseCandidates;

  if (parsedAY) {
    matchingRules = baseCandidates.filter((rule) => {
      const ruleStart = rule.effectiveFrom || '1970-01-01';
      const ruleEnd = rule.effectiveUntil || '9999-12-31';
      return ruleStart <= parsedAY.endDate && parsedAY.startDate <= ruleEnd;
    });
  } else {
    // Tanpa academicYear spesifik: cari rule aktif (bukan superseded)
    const activeCandidates = baseCandidates.filter(
      (rule) => rule.verificationStatus !== 'SUPERSEDED'
    );
    matchingRules = activeCandidates.length > 0 ? activeCandidates : baseCandidates;
  }

  if (matchingRules.length === 0) {
    return null;
  }

  // 4. Pisahkan Active vs Superseded
  const activeCandidates = matchingRules.filter(
    (r) => r.verificationStatus !== 'SUPERSEDED'
  );
  const supersededCandidates = matchingRules.filter(
    (r) => r.verificationStatus === 'SUPERSEDED'
  );

  let matchedRule: (typeof ALL_CURRICULUM_STRUCTURE_RULES)[0];

  if (activeCandidates.length > 1) {
    // Ambiguity handling: JANGAN pilih .find() pertama jika tumpang tindih
    const phase = getPhaseForGrade(grade) || 'A';
    return {
      level,
      grade,
      phase,
      subject,
      structureRule: null,
      rule: activeCandidates[0],
      regulationSources: [],
      verificationStatus: 'UNVERIFIED',
      intrakurikulerAnnualJP: null,
      kokurikulerAnnualJP: null,
      totalAnnualJP: null,
      referenceWeeksPerYear: null,
      minutesPerJP: null,
      derivedWeeklyJP: null,
      actualAvailableAnnualJP: null,
      actualEffectiveWeeks: null,
      isOfficial: false,
      isAmbiguous: true,
      ambiguityReason: `Ditemukan ${activeCandidates.length} aturan aktif yang tumpang tindih untuk ${subject.name} Kelas ${grade} pada tahun ajaran ${academicYear || 'berjalan'}.`,
      explanation: `Ambiguitas aturan kurikulum: lebih dari satu aturan aktif terdefinisi.`,
    };
  } else if (activeCandidates.length === 1) {
    matchedRule = activeCandidates[0];
  } else if (supersededCandidates.length === 1 && parsedAY) {
    // Historical lookup: diperbolehkan jika tahun ajaran berada pada masa berlakunya
    matchedRule = supersededCandidates[0];
  } else {
    return null;
  }

  // 5. Resolve Regulation Sources
  const regulationSources = getRegulationSources(matchedRule.regulationIds);

  // 6. Pemisahan Tegas JP Normatif Regulasi vs JP Tersedia Aktual Sekolah
  // actualAvailableAnnualJP HANYA dihitung bila terdapat jadwal aktual sekolah yang eksplisit:
  // - actualScheduledAnnualJP (paling kuat)
  // - ATAU (actualWeeklyJP + valid schoolWeeksPerYear) jika weeklyJPSource !== 'REFERENCE_EQUIVALENT'
  // JANGAN PERNAH gunakan derivedWeeklyJP (normatif) untuk menghitung actualAvailableAnnualJP,
  // baik untuk allocationMode 'ANNUAL' maupun 'WEEKLY_EQUIVALENT'!

  const hasValidActualWeeks =
    schoolWeeksPerYear != null &&
    typeof schoolWeeksPerYear === 'number' &&
    schoolWeeksPerYear > 0;

  const allocationMode =
    matchedRule.allocationMode ||
    (matchedRule.derivedWeeklyJP && matchedRule.derivedWeeklyJP % 1 !== 0
      ? 'ANNUAL'
      : 'WEEKLY_EQUIVALENT');

  let actualAvailableAnnualJP: number | null = null;
  let resolvedProvenance: 'CALENDAR' | 'MANUAL_VALIDATED' | undefined = undefined;

  if (params.actualScheduledAnnualJP != null && typeof params.actualScheduledAnnualJP === 'number') {
    actualAvailableAnnualJP = params.actualScheduledAnnualJP;
    resolvedProvenance = actualWeeksProvenance || 'MANUAL_VALIDATED';
  } else if (
    params.actualWeeklyJP != null &&
    typeof params.actualWeeklyJP === 'number' &&
    params.weeklyJPSource !== 'REFERENCE_EQUIVALENT' &&
    hasValidActualWeeks
  ) {
    actualAvailableAnnualJP = schoolWeeksPerYear * params.actualWeeklyJP;
    resolvedProvenance = actualWeeksProvenance || 'CALENDAR';
  } else {
    // Jika tidak ada actualWeeklyJP atau actualScheduledAnnualJP eksplisit:
    // derivedWeeklyJP normatif BUKAN jadwal aktual sekolah, maka actualAvailableAnnualJP = null
    actualAvailableAnnualJP = null;
    resolvedProvenance = undefined;
  }

  const actualEffectiveWeeks = hasValidActualWeeks ? schoolWeeksPerYear : null;

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
    allocationMode,
    actualAvailableAnnualJP,
    actualEffectiveWeeks,
    actualWeeksProvenance: resolvedProvenance,
    isElective:
      matchedRule.subjectType === 'ELECTIVE' ||
      matchedRule.subjectType === 'LOCAL_CONTENT',
    effectivePhase: phase,
    isOfficial: matchedRule.verificationStatus === 'VERIFIED',
    isAmbiguous: false,
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
