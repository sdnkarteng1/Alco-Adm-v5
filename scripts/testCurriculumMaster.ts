/**
 * TEST SUITE: MASTER REGULASI KURIKULUM NASIONAL (SD, SMP, SMA)
 *
 * Menguji:
 * 1. Konsistensi Internal Struktur JP (Permendikbudristek 12/2024 & Permendikdasmen 13/2025)
 * 2. Pemetaan Fase Resmi (Fase A - F)
 * 3. Pemetaan Jenjang Sekolah (SD, SMP, SMA)
 * 4. Resolusi Alias Subjek & Kode Baku
 * 5. Ketetapan Permendikdasmen No. 13 Tahun 2025 (Koding & AI, Bahasa Inggris)
 * 6. Pemisahan JP Normatif Tahunan vs JP Ekuivalen Mingguan vs JP Tersedia Aktual
 * 7. Kompatibilitas jpEngine (getSubjectJP)
 * 8. Master Capaian Pembelajaran (CP)
 */

import {
  ALL_CURRICULUM_STRUCTURE_RULES,
  resolveCurriculumContext,
  getPhaseForGrade,
  getSchoolLevelForGrade,
  validateAllStructureRules,
  findSubjectByCode,
  findSubjectByNameOrAlias,
  CURRICULUM_REGULATIONS,
  findCPBySubjectAndPhase,
  SD_CP_ENTRIES,
  SMP_CP_ENTRIES,
  SMA_CP_ENTRIES,
} from '../src/data/curriculum';
import { getSubjectJP } from '../src/services/jpEngine';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ ${message}`);
  }
}

async function runCurriculumMasterTests() {
  console.log('===========================================================');
  console.log('🏛️ RUNNING TEST SUITE: MASTER REGULASI KURIKULUM SD–SMA');
  console.log('===========================================================');

  // TEST 1: Validasi Integritas Seluruh Struktur JP Resmi
  console.log('\n--- 1. Validasi Integritas Struktur JP ---');
  const validationSummary = validateAllStructureRules();
  if (validationSummary.errors.length > 0) {
    console.log('Errors found in validation:', JSON.stringify(validationSummary.errors.slice(0, 10), null, 2));
  }
  assert(
    validationSummary.valid,
    `Semua rule struktur kurikulum valid secara matematis (${validationSummary.totalRules} rules)`
  );
  assert(
    validationSummary.errors.length === 0,
    `Tidak ada error struktur JP (errors: ${validationSummary.errors.length})`
  );
  assert(
    validationSummary.verifiedRules > 0,
    `Terdapat ${validationSummary.verifiedRules} rule terverifikasi resmi`
  );

  // TEST 2: Setiap Regulation ID Terdaftar pada Master Regulasi Resmi
  console.log('\n--- 2. Validasi Sumber Regulasi Resmi ---');
  const regMap = new Map(CURRICULUM_REGULATIONS.map((r) => [r.id, r]));
  for (const rule of ALL_CURRICULUM_STRUCTURE_RULES) {
    for (const regId of rule.regulationIds) {
      assert(
        regMap.has(regId),
        `Rule ${rule.id} mereferensikan sumber regulasi valid: ${regId}`
      );
    }
  }

  // TEST 3: Pemetaan Fase Resmi (Fase A - F)
  console.log('\n--- 3. Pemetaan Fase Resmi (Fase A - F) ---');
  assert(getPhaseForGrade(1) === 'A', 'Kelas 1 adalah Fase A');
  assert(getPhaseForGrade(2) === 'A', 'Kelas 2 adalah Fase A');
  assert(getPhaseForGrade(3) === 'B', 'Kelas 3 adalah Fase B');
  assert(getPhaseForGrade(4) === 'B', 'Kelas 4 adalah Fase B');
  assert(getPhaseForGrade(5) === 'C', 'Kelas 5 adalah Fase C');
  assert(getPhaseForGrade(6) === 'C', 'Kelas 6 adalah Fase C');
  assert(getPhaseForGrade(7) === 'D', 'Kelas 7 adalah Fase D');
  assert(getPhaseForGrade(8) === 'D', 'Kelas 8 adalah Fase D');
  assert(getPhaseForGrade(9) === 'D', 'Kelas 9 adalah Fase D');
  assert(getPhaseForGrade(10) === 'E', 'Kelas 10 adalah Fase E');
  assert(getPhaseForGrade(11) === 'F', 'Kelas 11 adalah Fase F');
  assert(getPhaseForGrade(12) === 'F', 'Kelas 12 adalah Fase F');

  // TEST 4: Pemetaan Jenjang Sekolah
  console.log('\n--- 4. Pemetaan Jenjang Sekolah (SD, SMP, SMA) ---');
  assert(getSchoolLevelForGrade(1) === 'SD', 'Kelas 1 jenjang SD');
  assert(getSchoolLevelForGrade(6) === 'SD', 'Kelas 6 jenjang SD');
  assert(getSchoolLevelForGrade(7) === 'SMP', 'Kelas 7 jenjang SMP');
  assert(getSchoolLevelForGrade(9) === 'SMP', 'Kelas 9 jenjang SMP');
  assert(getSchoolLevelForGrade(10) === 'SMA', 'Kelas 10 jenjang SMA');
  assert(getSchoolLevelForGrade(12) === 'SMA', 'Kelas 12 jenjang SMA');

  // TEST 5: Resolusi Alias Subjek & Normalisasi
  console.log('\n--- 5. Resolusi Alias Subjek ---');
  const pjok1 = findSubjectByNameOrAlias('PJOK');
  const pjok2 = findSubjectByNameOrAlias('Pendidikan Jasmani, Olahraga, dan Kesehatan');
  const pjok3 = findSubjectByNameOrAlias('Penjasorkes');
  assert(pjok1?.code === 'PJOK', 'Alias PJOK teresolusi ke PJOK');
  assert(pjok2?.code === 'PJOK', 'Nama lengkap PJOK teresolusi ke PJOK');
  assert(pjok3?.code === 'PJOK', 'Alias Penjasorkes teresolusi ke PJOK');

  const ipas1 = findSubjectByNameOrAlias('IPAS');
  const ipas2 = findSubjectByNameOrAlias('Ilmu Pengetahuan Alam dan Sosial');
  assert(ipas1?.code === 'IPAS', 'Alias IPAS teresolusi ke IPAS');
  assert(ipas2?.code === 'IPAS', 'Nama lengkap IPAS teresolusi ke IPAS');

  const coding1 = findSubjectByNameOrAlias('Koding dan Kecerdasan Artifisial');
  const coding2 = findSubjectByNameOrAlias('Coding & AI');
  const coding3 = findSubjectByNameOrAlias('Kecerdasan Buatan');
  assert(coding1?.code === 'CODING_AI', 'Nama resmi Koding & AI teresolusi ke CODING_AI');
  assert(coding2?.code === 'CODING_AI', 'Alias Coding & AI teresolusi ke CODING_AI');
  assert(coding3?.code === 'CODING_AI', 'Alias Kecerdasan Buatan teresolusi ke CODING_AI');

  // TEST 6: Ketetapan Permendikdasmen No. 13 Tahun 2025
  console.log('\n--- 6. Ketetapan Permendikdasmen No. 13 Tahun 2025 ---');
  const codingGrade4 = resolveCurriculumContext({
    grade: 4,
    subjectInput: 'Coding & AI',
  });
  assert(codingGrade4 !== null, 'Coding & AI ditemukan untuk Kelas 4 SD');
  assert(codingGrade4?.derivedWeeklyJP === 2, 'Coding & AI Kelas 4 dialokasikan 2 JP/minggu');
  assert(codingGrade4?.intrakurikulerAnnualJP === 72, 'Coding & AI Kelas 4 dialokasikan 72 JP/tahun');
  assert(codingGrade4?.isElective === true, 'Coding & AI berstatus mapel pilihan (ELECTIVE)');
  assert(
    codingGrade4?.regulationSources.some((r) => r.id === 'REG-PERMENDIKDASMEN-13-2025') === true,
    'Coding & AI bersumber dari Permendikdasmen No. 13 Tahun 2025'
  );

  // TEST 7: Pemisahan JP Normatif Tahunan vs JP Ekuivalen Mingguan vs JP Tersedia Aktual
  console.log('\n--- 7. Pemisahan Tiga Lapisan JP ---');
  // Contoh: Matematika Kelas 4 (Normatif 36 minggu = 180 JP, Mingguan = 5 JP)
  // Sekolah memiliki 34 minggu efektif aktual di kalendernya
  const matGrade4WithActualWeeks = resolveCurriculumContext({
    grade: 4,
    subjectInput: 'Matematika',
    schoolWeeksPerYear: 34,
  });
  assert(matGrade4WithActualWeeks !== null, 'Matematika Kelas 4 ditemukan');
  assert(matGrade4WithActualWeeks?.intrakurikulerAnnualJP === 180, 'JP Normatif Tahunan = 180 JP');
  assert(matGrade4WithActualWeeks?.derivedWeeklyJP === 5, 'JP Ekuivalen Mingguan = 5 JP/minggu');
  assert(matGrade4WithActualWeeks?.actualAvailableAnnualJP === 170, 'JP Tersedia Aktual Sekolah (34 × 5) = 170 JP');
  assert(
    matGrade4WithActualWeeks?.intrakurikulerAnnualJP !== matGrade4WithActualWeeks?.actualAvailableAnnualJP,
    'JP Normatif Tahunan (180 JP) dan JP Aktual Sekolah (170 JP) terpisah dengan tepat dan tidak saling menimpa'
  );

  // TEST 8: Kompatibilitas jpEngine (getSubjectJP)
  console.log('\n--- 8. Kompatibilitas jpEngine (getSubjectJP) ---');
  const jpSD = getSubjectJP({
    curriculum: 'Kurikulum Merdeka',
    level: 'SD',
    grade: 'Kelas 4',
    subject: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
  });
  assert(jpSD.isOfficial === true, 'JP PJOK SD Kelas 4 terverifikasi resmi');
  assert(jpSD.weeklyJP === 3, 'JP PJOK SD Kelas 4 adalah 3 JP/minggu');
  assert(jpSD.intrakurikulerAnnualJP === 108, 'JP Intrakurikuler Tahunan PJOK SD Kelas 4 adalah 108 JP');
  assert(jpSD.kokurikulerAnnualJP === 36, 'JP Kokurikuler Tahunan PJOK SD Kelas 4 adalah 36 JP');
  assert(jpSD.totalAnnualJP === 144, 'Total Tahunan PJOK SD Kelas 4 adalah 144 JP');

  const jpSMP = getSubjectJP({
    curriculum: 'Kurikulum Merdeka',
    level: 'SMP',
    grade: 'Kelas 7',
    subject: 'Informatika',
  });
  assert(jpSMP.isOfficial === true, 'Informatika SMP Kelas 7 terverifikasi resmi');
  assert(jpSMP.weeklyJP === 2, 'Informatika SMP Kelas 7 adalah 2 JP (derived)');
  assert(jpSMP.intrakurikulerAnnualJP === 72, 'Informatika SMP Kelas 7 adalah 72 JP intra tahunan');
  assert(jpSMP.kokurikulerAnnualJP === 36, 'Informatika SMP Kelas 7 adalah 36 JP kokurikuler tahunan');

  const jpSMA = getSubjectJP({
    curriculum: 'Kurikulum Merdeka',
    level: 'SMA',
    grade: 'Kelas 10',
    subject: 'Fisika',
  });
  assert(jpSMA.isOfficial === true, 'Fisika SMA Kelas 10 terverifikasi resmi');
  assert(jpSMA.intrakurikulerAnnualJP === 72, 'Fisika SMA Kelas 10 adalah 72 JP intra tahunan');

  // TEST 9: Master Capaian Pembelajaran (CP)
  console.log('\n--- 9. Master Capaian Pembelajaran (CP) ---');
  assert(SD_CP_ENTRIES.length > 0, `SD memiliki ${SD_CP_ENTRIES.length} CP master`);
  assert(SMP_CP_ENTRIES.length > 0, `SMP memiliki ${SMP_CP_ENTRIES.length} CP master`);
  assert(SMA_CP_ENTRIES.length > 0, `SMA memiliki ${SMA_CP_ENTRIES.length} CP master`);

  const cpPjokA = findCPBySubjectAndPhase('PJOK', 'A');
  assert(cpPjokA !== undefined, 'CP PJOK Fase A ditemukan');
  assert(cpPjokA?.phase === 'A', 'Fase CP adalah Fase A');
  assert(cpPjokA?.elements.length === 4, 'CP PJOK Fase A memiliki 4 elemen capaian pembelajaran');

  const cpMatB = findCPBySubjectAndPhase('Matematika', 'B');
  assert(cpMatB !== undefined, 'CP Matematika Fase B ditemukan');
  assert(cpMatB?.elements.some((e) => e.name === 'Bilangan') === true, 'Elemen Bilangan ada pada CP Matematika Fase B');

  const cpIpasC = findCPBySubjectAndPhase('IPAS', 'C');
  assert(cpIpasC !== undefined, 'CP IPAS Fase C ditemukan');

  const cpInformatikaD = findCPBySubjectAndPhase('Informatika', 'D');
  assert(cpInformatikaD !== undefined, 'CP Informatika Fase D ditemukan');

  console.log('\n===========================================================');
  console.log('🎉 ALL CURRICULUM MASTER TESTS PASSED SUCCESSFULLY!');
  console.log('===========================================================');
}

runCurriculumMasterTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
