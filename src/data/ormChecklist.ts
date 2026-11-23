import type { OrmChecklistItem, OrmSectionId } from '../types/orm';

export const ORM_SECTIONS: { id: OrmSectionId; code: string; title: string; subtitle: string }[] = [
  {
    id: 'A',
    code: 'Section A',
    title: 'Human Factors',
    subtitle: 'Currency, fatigue, crew readiness, and physiological load',
  },
  {
    id: 'B',
    code: 'Section B',
    title: 'Mission',
    subtitle: 'Profile complexity, airfield familiarity, low-level, and tasking changes',
  },
  {
    id: 'C',
    code: 'Section C',
    title: 'Environment',
    subtitle: 'Destination winds, weather minimums, thermal stress, and illumination',
  },
];

export const ORM_CHECKLIST_ITEMS: OrmChecklistItem[] = [
  // SECTION A: HUMAN FACTORS
  {
    id: 'last_sortie',
    number: 1,
    section: 'A',
    title: 'Last Sortie',
    options: [
      { id: 'lt_7', label: '< 7 Days', points: 0 },
      { id: 'gt_7', label: '> 7 Days', points: 1 },
      { id: 'gt_14', label: '> 14 Days', points: 2 },
      { id: 'gt_21', label: '> 21 Days', points: 4 },
      { id: 'gt_28', label: '> 28 Days', points: 6 },
    ],
  },
  {
    id: 'flying_cap_unsat',
    number: 2,
    section: 'A',
    title: 'Flying CAP / Unsat (Additive)',
    options: [
      { id: 'no', label: 'No', points: 0 },
      { id: 'cap_unsat', label: 'CAP or Sitting on Unsat', points: 1 },
      { id: 'pc_ec', label: 'PC / EC', points: 2 },
    ],
  },
  {
    id: 'number_of_sorties',
    number: 3,
    section: 'A',
    title: 'Number of Sorties',
    options: [
      { id: 'first', label: 'First Sortie', points: 0 },
      { id: 'second', label: 'Second Sortie', points: 1 },
      { id: 'third_tactical_fourth_xc', label: '3rd Tactical Sortie / 4th XC Sortie', points: 6 },
    ],
  },
  {
    id: 'consecutive_flying_days',
    number: 4,
    section: 'A',
    title: 'Number of Days Consecutive Flying',
    options: [
      { id: 'lt_4', label: '< 4 Days', points: 0 },
      { id: '5_to_7', label: '5 - 7 Days', points: 2 },
      { id: 'gt_7', label: '> 7 Days', points: 6 },
    ],
  },
  {
    id: 'early_showtime',
    number: 5,
    section: 'A',
    title: 'Early Showtime',
    options: [
      { id: 'gt_0530', label: '> 0530L', points: 0 },
      { id: 'lt_0530_turn', label: '< 0530L or night to day 1st go turn', points: 1 },
      { id: 'lt_0430', label: '< 0430L', points: 2 },
    ],
  },
  {
    id: 'experience_level_ip',
    number: 6,
    section: 'A',
    title: 'Experience Level (IP)',
    options: [
      { id: 'gt_150', label: '> 150 Hours', points: 0 },
      { id: '50_to_100', label: '50 - 100 Hours', points: 1 },
      { id: 'lt_50', label: '< 50 Hours', points: 2 },
    ],
  },
  {
    id: 'sleep_cycle',
    number: 7,
    section: 'A',
    title: 'Sleep Cycle',
    subtitle: 'Select exact points (1–3) if Rested 6–7 Hrs',
    options: [
      { id: 'well_rested', label: 'Well Rested (>= 8 Hrs)', points: 0 },
      { id: 'rested', label: 'Rested (6 - 7 Hrs)', points: 1, variableScores: [1, 2, 3] },
      { id: 'poorly_rested', label: 'Poorly Rested (< 4 Hrs)', points: 6 },
    ],
  },
  {
    id: 'personal_stress',
    number: 8,
    section: 'A',
    title: 'Personal Stress',
    subtitle: 'Select exact points (1–4) if Medium',
    options: [
      { id: 'low', label: 'Low', points: 0 },
      { id: 'medium', label: 'Medium', points: 1, variableScores: [1, 2, 3, 4] },
      { id: 'high', label: 'High', points: 6 },
    ],
  },

  // SECTION B: MISSION
  {
    id: 'sortie_type',
    number: 9,
    section: 'B',
    title: 'Sortie Type',
    subtitle: 'Select exact points (3–6) for Evaluation sortie',
    options: [
      { id: 'local', label: 'Local', points: 0 },
      { id: 'off_station', label: 'Off Station', points: 1 },
      { id: 'cas_sat_bsa', label: 'CAS / SAT / BSA', points: 2 },
      { id: 'evaluation', label: 'Evaluation', points: 3, variableScores: [3, 4, 5, 6] },
    ],
  },
  {
    id: 'airfield_type',
    number: 10,
    section: 'B',
    title: 'Airfield Type',
    options: [
      { id: 'familiar', label: 'Familiar', points: 0 },
      { id: 'unfamiliar_day', label: 'Unfamiliar - Day', points: 1 },
      { id: 'unfamiliar_night', label: 'Unfamiliar - Night', points: 2 },
    ],
  },
  {
    id: 'low_level_sortie',
    number: 11,
    section: 'B',
    title: 'Low Level Sortie',
    options: [
      { id: 'none', label: 'None / N/A', points: 0 },
      { id: 'local_low_level', label: 'Local Low Level Route', points: 1 },
      { id: 'lowat', label: 'LOWAT (Low Altitude Training)', points: 2 },
      { id: 'mountainous_hi_da', label: 'Mountainous / Hi DA Low Level', points: 4 },
    ],
  },
  {
    id: 'short_notice_change',
    number: 12,
    section: 'B',
    title: 'Short Notice Change',
    options: [
      { id: 'none', label: 'None / Scheduled', points: 0 },
      { id: 'pre_brief', label: 'Pre-Brief (Short Notice)', points: 1 },
      { id: 'during_brief', label: 'During Brief (Daytime Scramble)', points: 2 },
      { id: 'post_brief', label: 'Post Brief (Nighttime Scramble)', points: 3 },
    ],
  },

  // SECTION C: ENVIRONMENT
  {
    id: 'winds_destination',
    number: 13,
    section: 'C',
    title: 'Winds @ Destination',
    options: [
      { id: 'calm', label: '<= 10 kts / Calm', points: 0 },
      { id: 'moderate', label: '> 10-15 kts, TW 1-5 kts, Gust 5-10 kts', points: 1 },
      { id: 'high', label: '> 15 kts, TW > 5 kts, Gust > 10 kts', points: 2 },
    ],
  },
  {
    id: 'wx_destination',
    number: 14,
    section: 'C',
    title: 'WX @ Destination',
    options: [
      { id: 'vmc', label: 'VMC', points: 0 },
      { id: 'imc', label: 'IMC', points: 1 },
      { id: 'special_vfr', label: 'Special VFR', points: 2 },
    ],
  },
  {
    id: 'its_thermal_stress',
    number: 15,
    section: 'C',
    title: 'ITS (Index of Thermal Stress)',
    options: [
      { id: 'normal', label: 'NORMAL < 35°C', points: 0 },
      { id: 'caution', label: 'CAUTION 36 - 40°C', points: 1 },
      { id: 'danger', label: 'DANGER > 45°C', points: 2 },
    ],
  },
  {
    id: 'night_illumination',
    number: 16,
    section: 'C',
    title: 'NIGHT',
    options: [
      { id: 'day', label: 'Day Sortie / N/A', points: 0 },
      { id: 'hi_illum', label: 'Hi Illum (11th - Last Day of the Month)', points: 1 },
      { id: 'low_illum', label: 'Low Illum (1st - 10th Day of the Month)', points: 2 },
    ],
  },
];
