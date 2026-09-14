import { CurriculumStructureRule, ValidationIssue } from './types';
import { ALL_CURRICULUM_STRUCTURE_RULES } from './structure';

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

/**
 * Memvalidasi konsistensi internal dari sebuah CurriculumStructureRule
 */
export function validateStructureRule(rule: CurriculumStructureRule): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Validasi Total JP
  if (rule.intrakurikulerAnnualJP + rule.kokurikulerAnnualJP !== rule.totalAnnualJP) {
    issues.push({
      ruleId: rule.id,
      field: 'totalAnnualJP',
      message: `Total annual JP mismatch: intra (${rule.intrakurikulerAnnualJP}) + kokuri (${rule.kokurikulerAnnualJP}) !== total (${rule.totalAnnualJP})`,
      severity: 'ERROR',
    });
  }

  // 2. Validasi Ekuivalensi JP Mingguan
  const expectedWeeklyJP = Math.round(rule.intrakurikulerAnnualJP / rule.referenceWeeksPerYear);
  if (rule.derivedWeeklyJP !== expectedWeeklyJP) {
    issues.push({
      ruleId: rule.id,
      field: 'derivedWeeklyJP',
      message: `Weekly JP mismatch: derived (${rule.derivedWeeklyJP}) vs calculated intra/weeks (${expectedWeeklyJP})`,
      severity: 'ERROR',
    });
  }

  // 3. Validasi Regulasi Rujukan
  if (!rule.regulationIds || rule.regulationIds.length === 0) {
    issues.push({
      ruleId: rule.id,
      field: 'regulationIds',
      message: `Aturan tidak memiliki sumber rujukan regulasi resmi (regulationIds kosong)`,
      severity: 'ERROR',
    });
  }

  // 4. Validasi Pemetaan Kelas ke Fase (Kurikulum Merdeka)
  if (rule.curriculumType === 'KURIKULUM_MERDEKA' && rule.phase) {
    if ((rule.grade === 1 || rule.grade === 2) && rule.phase !== 'A') {
      issues.push({
        ruleId: rule.id,
        field: 'phase',
        message: `Kelas ${rule.grade} harus Fase A, ditemukan Fase ${rule.phase}`,
        severity: 'ERROR',
      });
    } else if ((rule.grade === 3 || rule.grade === 4) && rule.phase !== 'B') {
      issues.push({
        ruleId: rule.id,
        field: 'phase',
        message: `Kelas ${rule.grade} harus Fase B, ditemukan Fase ${rule.phase}`,
        severity: 'ERROR',
      });
    } else if ((rule.grade === 5 || rule.grade === 6) && rule.phase !== 'C') {
      issues.push({
        ruleId: rule.id,
        field: 'phase',
        message: `Kelas ${rule.grade} harus Fase C, ditemukan Fase ${rule.phase}`,
        severity: 'ERROR',
      });
    } else if ([7, 8, 9].includes(rule.grade) && rule.phase !== 'D') {
      issues.push({
        ruleId: rule.id,
        field: 'phase',
        message: `Kelas ${rule.grade} harus Fase D, ditemukan Fase ${rule.phase}`,
        severity: 'ERROR',
      });
    } else if (rule.grade === 10 && rule.phase !== 'E') {
      issues.push({
        ruleId: rule.id,
        field: 'phase',
        message: `Kelas 10 harus Fase E, ditemukan Fase ${rule.phase}`,
        severity: 'ERROR',
      });
    } else if ((rule.grade === 11 || rule.grade === 12) && rule.phase !== 'F') {
      issues.push({
        ruleId: rule.id,
        field: 'phase',
        message: `Kelas ${rule.grade} harus Fase F, ditemukan Fase ${rule.phase}`,
        severity: 'ERROR',
      });
    }
  }

  // 5. Cek Status Verifikasi
  if (rule.verificationStatus === 'UNVERIFIED') {
    issues.push({
      ruleId: rule.id,
      field: 'verificationStatus',
      message: `Aturan ini berstatus UNVERIFIED dan memerlukan telaah regulasi lebih lanjut`,
      severity: 'WARNING',
    });
  }

  return {
    isValid: issues.filter((i) => i.severity === 'ERROR').length === 0,
    issues,
  };
}

/**
 * Validasi seluruh master struktur kurikulum
 */
export function validateAllStructureRules(
  rules: CurriculumStructureRule[] = ALL_CURRICULUM_STRUCTURE_RULES
) {
  const allIssues: ValidationIssue[] = [];

  for (const rule of rules) {
    const res = validateStructureRule(rule);
    if (res.issues.length > 0) {
      allIssues.push(...res.issues);
    }
  }

  const errors = allIssues.filter((i) => i.severity === 'ERROR');
  const warnings = allIssues.filter((i) => i.severity === 'WARNING');
  const verifiedRules = rules.filter((r) => r.verificationStatus === 'VERIFIED').length;
  const unverifiedRules = rules.filter((r) => r.verificationStatus === 'UNVERIFIED').length;
  const supersededRules = rules.filter((r) => r.verificationStatus === 'SUPERSEDED').length;

  return {
    valid: errors.length === 0,
    totalRules: rules.length,
    verifiedRules,
    unverifiedRules,
    supersededRules,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
    issues: allIssues,
  };
}
