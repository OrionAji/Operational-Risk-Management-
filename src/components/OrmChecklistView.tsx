import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  RotateCcw,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { ORM_CHECKLIST_ITEMS, ORM_SECTIONS } from '../data/ormChecklist';
import type {
  OrmEvaluationResult,
  OrmSelectionMap,
  OrmSubmission,
  UserRoleProfile,
} from '../types/orm';
import {
  evaluateOrmChecklist,
  getDefaultSelections,
  getTodayIsoDate,
  ROLE_FULL_LABELS,
  validateOrmHeaderAndMitigation,
} from '../utils/ormScoring';
import {
  getRiskBannerTextColor,
  OrmStatusText,
  RiskScoreMeter,
  RiskTierBadge,
  RiskTierIcon,
} from './RiskVisuals';

interface OrmChecklistViewProps {
  user: UserRoleProfile;
  mySubmissions: OrmSubmission[];
  onSubmitOrm: (payload: {
    pilotName: string;
    rankCallsign: string;
    sortieDate: string;
    aircraftTail: string;
    missionCallsign: string;
    mitigationNotes: string;
    evaluation: OrmEvaluationResult;
  }) => Promise<void>;
  onSelectSubmission: (orm: OrmSubmission) => void;
}

export const OrmChecklistView: React.FC<OrmChecklistViewProps> = ({
  user,
  mySubmissions,
  onSubmitOrm,
  onSelectSubmission,
}) => {
  const [subView, setSubView] = useState<'form' | 'history'>('form');
  const [pilotName, setPilotName] = useState(user.displayName);
  const [rankCallsign, setRankCallsign] = useState(user.rankCallsign);
  const [sortieDate, setSortieDate] = useState(getTodayIsoDate());
  const [aircraftTail, setAircraftTail] = useState('');
  const [missionCallsign, setMissionCallsign] = useState('');
  const [mitigationNotes, setMitigationNotes] = useState('');
  const [selections, setSelections] = useState<OrmSelectionMap>(() => getDefaultSelections());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<{
    message: string;
    status: string;
    colorHex: string;
  } | null>(null);

  const evaluation = useMemo(
    () => evaluateOrmChecklist(selections, user.commandRole),
    [selections, user.commandRole]
  );

  const handleOptionSelect = (itemId: string, optionId: string, defaultPoints: number) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { optionId, points: defaultPoints },
    }));
  };

  const handleVariableScoreSelect = (itemId: string, optionId: string, exactPoints: number) => {
    setSelections((prev) => ({
      ...prev,
      [itemId]: { optionId, points: exactPoints },
    }));
  };

  const handleReset = () => {
    setSelections(getDefaultSelections());
    setAircraftTail('');
    setMissionCallsign('');
    setMitigationNotes('');
    setValidationErrors([]);
    setSubmitBanner(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSubmitBanner(null);

    const errors = validateOrmHeaderAndMitigation(
      {
        pilotName,
        rankCallsign,
        sortieDate,
        aircraftTail,
        missionCallsign,
        mitigationNotes,
      },
      evaluation.totalScore
    );

    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setValidationErrors([]);
    setSubmitting(true);
    try {
      await onSubmitOrm({
        pilotName,
        rankCallsign,
        sortieDate,
        aircraftTail,
        missionCallsign,
        mitigationNotes,
        evaluation,
      });

      setSubmitBanner({
        message:
          evaluation.totalScore <= 5
            ? `Mission ${missionCallsign.toUpperCase()} (${evaluation.totalScore} pts) auto-cleared for flight.`
            : `Mission ${missionCallsign.toUpperCase()} (${evaluation.totalScore} pts) submitted and routed to ${evaluation.requiredMdaRole} with push alert dispatched.`,
        status: evaluation.initialStatus,
        colorHex: evaluation.riskMeta.colorHex,
      });
      setSelections(getDefaultSelections());
      setAircraftTail('');
      setMissionCallsign('');
      setMitigationNotes('');
      setSubView('history');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setValidationErrors([
        err instanceof Error ? err.message : 'Unable to submit ORM. Please try again.',
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-28">
      {/* Page Header & Segmented Sub-View Switch */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-none">
            My Flight ORM
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Pre-flight 16-item risk assessment · Real-time four-tier scoring and MDA routing
          </p>
        </div>

        <div
          className="inline-flex items-center p-1 rounded-lg bg-slate-200/80 self-start sm:self-auto"
          role="tablist"
          aria-label="Flight ORM sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'form'}
            onClick={() => setSubView('form')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subView === 'form'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pre-Flight Worksheet
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subView === 'history'}
            onClick={() => setSubView('history')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              subView === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Submissions ({mySubmissions.length})
          </button>
        </div>
      </div>

      {/* Submission Confirmation Banner */}
      {submitBanner && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: submitBanner.colorHex }}
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">{submitBanner.status}</p>
              <p className="text-xs text-slate-600 mt-0.5">{submitBanner.message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubmitBanner(null)}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 whitespace-nowrap"
          >
            Dismiss
          </button>
        </div>
      )}

      {subView === 'history' ? (
        <section aria-label="My submitted flight ORMs" className="space-y-4">
          {mySubmissions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <p className="font-display text-2xl font-bold text-slate-900">
                No Flight ORMs Submitted Yet
              </p>
              <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
                Complete your pre-flight ORM worksheet prior to stepping to the aircraft. Low-risk
                sorties clear immediately; elevated scores route automatically to your MDA.
              </p>
              <button
                type="button"
                onClick={() => setSubView('form')}
                className="mt-5 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#0F172A] text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
              >
                Start Pre-Flight ORM
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
              {mySubmissions.map((orm) => (
                <button
                  key={orm.id}
                  type="button"
                  onClick={() => onSelectSubmission(orm)}
                  className="w-full text-left px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-display text-xl font-bold text-slate-900">
                        {orm.missionCallsign}
                      </span>
                      <span className="font-mono-data text-xs text-slate-500">
                        {orm.aircraftTail} · {orm.sortieDate}
                      </span>
                      {orm.hasPendingWrites && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#B45309]">
                          <CloudUpload className="w-3.5 h-3.5" aria-hidden="true" />
                          Queued Offline
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <RiskTierBadge level={orm.riskLevel} score={orm.totalScore} compact />
                      <OrmStatusText status={orm.status} />
                      {orm.escalated && (
                        <span className="text-xs text-[#C2410C] font-medium">
                          · Escalated to {orm.requiredMdaRole}
                        </span>
                      )}
                    </div>
                    {orm.commandRemarks && (
                      <p className="text-xs text-slate-600 line-clamp-1 pt-0.5">
                        Command Remarks ({orm.decisionByRole}): {orm.commandRemarks}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 shrink-0">
                    <span>View Breakdown</span>
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} noValidate>
          {validationErrors.length > 0 && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-[#C62828]/35 bg-[#C62828]/8 p-4 text-sm text-[#C62828]"
            >
              <p className="font-semibold mb-1.5">Complete required pre-flight fields:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Main Left Column: Sortie Header + 16-Item Checklist */}
            <div className="lg:col-span-8 space-y-6">
              {/* Sortie Header Fields Card */}
              <section
                aria-labelledby="sortie-header-heading"
                className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
              >
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2
                    id="sortie-header-heading"
                    className="font-display text-2xl font-bold text-slate-900"
                  >
                    Sortie & Aircrew Header
                  </h2>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1 rounded-md border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Reset Form</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="orm-pilot-name"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Pilot Name
                    </label>
                    <input
                      id="orm-pilot-name"
                      type="text"
                      required
                      maxLength={100}
                      value={pilotName}
                      onChange={(e) => setPilotName(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:bg-white focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="orm-rank-callsign"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Rank / Callsign
                    </label>
                    <input
                      id="orm-rank-callsign"
                      type="text"
                      required
                      maxLength={60}
                      value={rankCallsign}
                      onChange={(e) => setRankCallsign(e.target.value)}
                      placeholder="Capt / ATLAS 41"
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="orm-sortie-date"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Sortie Date
                    </label>
                    <input
                      id="orm-sortie-date"
                      type="date"
                      required
                      value={sortieDate}
                      onChange={(e) => setSortieDate(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono-data text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="orm-aircraft-tail"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Aircraft / Tail Number
                    </label>
                    <input
                      id="orm-aircraft-tail"
                      type="text"
                      required
                      maxLength={40}
                      value={aircraftTail}
                      onChange={(e) => setAircraftTail(e.target.value)}
                      placeholder="e.g. C-130J #4071"
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono-data text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="orm-mission-callsign"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Mission Callsign
                    </label>
                    <input
                      id="orm-mission-callsign"
                      type="text"
                      required
                      maxLength={40}
                      value={missionCallsign}
                      onChange={(e) => setMissionCallsign(e.target.value)}
                      placeholder="e.g. ATLAS 41 / SPEAR 04"
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono-data text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                    />
                  </div>
                </div>
              </section>

              {/* Sections A, B, C Checklist */}
              {ORM_SECTIONS.map((section) => {
                const items = ORM_CHECKLIST_ITEMS.filter((i) => i.section === section.id);
                const sectionSubtotal = evaluation.sectionScores[section.id];

                return (
                  <section
                    key={section.id}
                    aria-labelledby={`section-${section.id}-heading`}
                    className="bg-white border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
                      <div>
                        <h2
                          id={`section-${section.id}-heading`}
                          className="font-display text-2xl font-bold text-slate-900 tracking-tight"
                        >
                          {section.code}: {section.title}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">{section.subtitle}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] font-medium text-slate-500">Section Total</div>
                        <div className="font-mono-data text-lg font-bold text-slate-900">
                          {sectionSubtotal} pts
                        </div>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {items.map((item) => {
                        const activeSelection = selections[item.id] ?? {
                          optionId: item.options[0].id,
                          points: item.options[0].points,
                        };

                        return (
                          <fieldset key={item.id} className="p-4 sm:p-5">
                            <div className="flex items-baseline justify-between gap-3 mb-3">
                              <legend className="text-sm font-semibold text-slate-900">
                                <span className="font-mono-data text-xs text-slate-400 mr-2">
                                  {String(item.number).padStart(2, '0')}.
                                </span>
                                {item.title}
                              </legend>
                              <span
                                className={`font-mono-data text-xs font-semibold shrink-0 ${
                                  activeSelection.points >= 4
                                    ? 'text-[#C62828]'
                                    : activeSelection.points >= 2
                                      ? 'text-[#E65100]'
                                      : activeSelection.points > 0
                                        ? 'text-[#B45309]'
                                        : 'text-slate-400'
                                }`}
                              >
                                +{activeSelection.points} pt{activeSelection.points === 1 ? '' : 's'}
                              </span>
                            </div>

                            {item.subtitle && (
                              <p className="text-xs text-slate-500 -mt-1.5 mb-3">{item.subtitle}</p>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {item.options.map((opt) => {
                                const isSelected = activeSelection.optionId === opt.id;
                                const scoreDisplay = opt.variableScores
                                  ? `${opt.variableScores[0]}–${opt.variableScores[opt.variableScores.length - 1]} pts`
                                  : `${opt.points} pt${opt.points === 1 ? '' : 's'}`;

                                return (
                                  <div
                                    key={opt.id}
                                    className={`rounded-lg border ${
                                      isSelected
                                        ? 'border-[#0F172A] ring-1 ring-[#0F172A] bg-[#0F172A]/[0.04]'
                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                    } ${opt.variableScores && isSelected ? 'sm:col-span-2' : ''}`}
                                  >
                                    <button
                                      type="button"
                                      aria-pressed={isSelected}
                                      onClick={() =>
                                        handleOptionSelect(
                                          item.id,
                                          opt.id,
                                          opt.variableScores ? opt.variableScores[0] : opt.points
                                        )
                                      }
                                      className="w-full min-h-[44px] px-3.5 py-2.5 text-left flex items-center justify-between gap-3"
                                    >
                                      <span className="flex items-center gap-2.5 min-w-0">
                                        <span
                                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                            isSelected
                                              ? 'border-[#0F172A] bg-[#0F172A]'
                                              : 'border-slate-300 bg-white'
                                          }`}
                                          aria-hidden="true"
                                        >
                                          {isSelected && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                          )}
                                        </span>
                                        <span
                                          className={`text-sm leading-snug ${
                                            isSelected
                                              ? 'font-semibold text-slate-950'
                                              : 'text-slate-700'
                                          }`}
                                        >
                                          {opt.label}
                                        </span>
                                      </span>
                                      <span className="font-mono-data text-xs font-medium text-slate-500 whitespace-nowrap shrink-0">
                                        {scoreDisplay}
                                      </span>
                                    </button>

                                    {/* Exact Variable Score Picker (Sleep Cycle 1-3, Personal Stress 1-4, Evaluation 3-6) */}
                                    {opt.variableScores && isSelected && (
                                      <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs font-medium text-slate-600">
                                          Pick exact risk score:
                                        </span>
                                        <div
                                          className="flex items-center gap-1.5"
                                          role="group"
                                          aria-label={`Exact score for ${item.title} ${opt.label}`}
                                        >
                                          {opt.variableScores.map((val) => {
                                            const activeVal = activeSelection.points === val;
                                            return (
                                              <button
                                                key={val}
                                                type="button"
                                                aria-pressed={activeVal}
                                                onClick={() =>
                                                  handleVariableScoreSelect(item.id, opt.id, val)
                                                }
                                                className={`min-h-[38px] min-w-[44px] px-3 py-1 rounded-md font-mono-data text-xs font-semibold border transition-colors ${
                                                  activeVal
                                                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                                                    : 'bg-white text-slate-700 border-slate-300 hover:border-slate-500'
                                                }`}
                                              >
                                                {val} pt{val === 1 ? '' : 's'}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </fieldset>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {/* Mitigation Notes / Remarks (Required when score >= 6) */}
              {evaluation.requiresMitigation && (
                <section
                  aria-labelledby="mitigation-notes-heading"
                  className="bg-white border rounded-xl p-5 sm:p-6"
                  style={{ borderColor: evaluation.riskMeta.colorHex }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h2
                      id="mitigation-notes-heading"
                      className="font-display text-2xl font-bold text-slate-900"
                    >
                      Mitigation Notes / Remarks
                    </h2>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: evaluation.riskMeta.colorHex }}
                    >
                      Required (Score &ge; 6)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    Document concrete risk mitigations, crew briefings, alternate planning, or
                    operational gates for {ROLE_FULL_LABELS[evaluation.requiredMdaRole]} review.
                  </p>
                  <label htmlFor="orm-mitigation-notes" className="sr-only">
                    Mitigation Notes and Remarks
                  </label>
                  <textarea
                    id="orm-mitigation-notes"
                    rows={4}
                    required
                    maxLength={2000}
                    value={mitigationNotes}
                    onChange={(e) => setMitigationNotes(e.target.value)}
                    placeholder="Example: Added 30-min crew rest buffer, verified crosswind margins, briefed hard abort limits with Instructor Pilot..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/15"
                  />
                </section>
              )}
            </div>

            {/* Desktop Sticky Live Assessment Summary Column */}
            <aside className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div
                  className="px-5 py-4 flex items-center justify-between"
                  style={{
                    backgroundColor: evaluation.riskMeta.colorHex,
                    color: getRiskBannerTextColor(evaluation.riskLevel),
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <RiskTierIcon level={evaluation.riskLevel} className="w-5 h-5 shrink-0" />
                    <span className="font-display text-xl font-bold tracking-wide">
                      {evaluation.riskMeta.label}
                    </span>
                  </div>
                  <span className="font-mono-data text-2xl font-bold leading-none">
                    {evaluation.totalScore}
                  </span>
                </div>

                <div className="p-5 space-y-5">
                  <RiskScoreMeter score={evaluation.totalScore} level={evaluation.riskLevel} />

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 text-center">
                    <div>
                      <div className="text-[11px] text-slate-500">Sec A</div>
                      <div className="font-mono-data text-base font-bold text-slate-900">
                        {evaluation.sectionScores.A}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Sec B</div>
                      <div className="font-mono-data text-base font-bold text-slate-900">
                        {evaluation.sectionScores.B}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Sec C</div>
                      <div className="font-mono-data text-base font-bold text-slate-900">
                        {evaluation.sectionScores.C}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">Required MDA</span>
                      <span className="font-semibold text-slate-900 text-xs text-right">
                        {evaluation.requiredMdaRole === 'Pilot'
                          ? 'Pilot Flying (Auto)'
                          : ROLE_FULL_LABELS[evaluation.requiredMdaRole]}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500">Post-Submit Status</span>
                      <OrmStatusText status={evaluation.initialStatus} />
                    </div>
                  </div>

                  {evaluation.escalationReason && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-900">
                      <ShieldAlert className="w-4 h-4 text-[#E65100] shrink-0 mt-0.5" />
                      <span>{evaluation.escalationReason}</span>
                    </div>
                  )}

                  {evaluation.topRiskDrivers.length > 0 && (
                    <div className="pt-3 border-t border-slate-200">
                      <div className="text-xs font-semibold text-slate-500 mb-2">
                        Active Risk Drivers
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {evaluation.topRiskDrivers.map((d, idx) => (
                          <li key={idx} className="leading-snug">
                            • {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        </form>
      )}

      {/* Mandatory Sticky Bottom Score Bar (Visible on Pre-Flight Worksheet) */}
      {subView === 'form' && (
        <div
          data-testid="sticky-orm-score-bar"
          className="fixed bottom-0 left-0 right-0 z-40 shadow-lg border-t border-black/15 transition-colors duration-150"
          style={{
            backgroundColor: evaluation.riskMeta.colorHex,
            color: getRiskBannerTextColor(evaluation.riskLevel),
          }}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <RiskTierIcon level={evaluation.riskLevel} className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                <div className="leading-none">
                  <div className="font-mono-data text-xl sm:text-2xl font-bold">
                    {evaluation.totalScore}{' '}
                    <span className="text-xs font-sans font-bold opacity-90">PTS</span>
                  </div>
                </div>
              </div>

              <div
                className={`min-w-0 border-l pl-2.5 sm:pl-4 leading-tight ${
                  evaluation.riskLevel === 'MODERATE' ? 'border-slate-900/25' : 'border-white/25'
                }`}
              >
                <div className="font-display text-base sm:text-lg font-bold tracking-wide truncate">
                  {evaluation.riskMeta.label}
                </div>
                <div className="text-[11px] sm:text-xs font-medium opacity-95 truncate">
                  MDA: {evaluation.requiredMdaRole === 'Pilot' ? 'Pilot Flying (Cleared)' : evaluation.requiredMdaRole}
                  {evaluation.escalated ? ' · Escalated' : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              className="min-h-[44px] px-4 sm:px-6 py-2 rounded-lg bg-white text-slate-950 font-semibold text-xs sm:text-sm hover:bg-slate-100 disabled:opacity-60 transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>
                {submitting
                  ? 'Submitting...'
                  : evaluation.totalScore <= 5
                    ? 'Submit & Clear'
                    : `Route to ${evaluation.requiredMdaRole}`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
