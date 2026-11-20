import React, { useState } from 'react';
import {
  Edit3,
  Check,
  X,
  Compass,
  MapPin,
  Beer,
  AlertTriangle,
  Flag,
  Navigation,
  Users,
  User,
} from 'lucide-react';
import {
  VALID_DRINK_TYPES,
  VALID_SHAPES,
  buildHoleSearchQuery,
  validateHoleInput,
  type DrinkCategory,
  type FairwayShape,
  type PlayerTourProfile,
  type PubCourse,
  type PubGolfGameMode,
  type PubHole,
} from '../utils/golfRules';
import { COURSE_AERIAL_IMG } from '../data/defaultTourData';
import { HoleVisualMap } from './HoleVisualMap';
import { GolferAvatar } from './GolferAvatar';
import { PubPlaceAutocomplete } from './PubPlaceAutocomplete';
import { PubRouteMap, primeResolvedPubStopCache } from './PubRouteMap';

interface CourseGuideViewProps {
  course: PubCourse;
  holes: PubHole[];
  activePlayer: PlayerTourProfile;
  selectedHoleNum: number;
  onSelectHole: (holeNumber: number) => void;
  onSaveHoleConfig: (updatedHole: PubHole) => Promise<void>;
  onSaveCourseMeta: (updatedCourse: PubCourse) => Promise<void>;
  onGoToScorecardHole: (holeNumber: number) => void;
}

const DRINK_TYPE_LABELS: Record<DrinkCategory, string> = {
  stout: 'Stout / Porter',
  lager: 'Lager / Pilsner',
  ipa: 'IPA / Pale Ale',
  cider: 'Cider / Syrligt',
  cocktail: 'Drink / Cocktail',
  shot: 'Shot (Par 1-special)',
  glögg: 'Vinterglögg',
  alkoholfritt: 'Alkoholfritt Alternativ',
};

const SHAPE_LABELS: Record<FairwayShape, string> = {
  straight: 'Rak Fairway (Straight)',
  'dogleg-left': 'Dogleg Vänster',
  'dogleg-right': 'Dogleg Höger',
  'island-green': 'Ö-Green (Vattenhinder)',
  'double-dogleg': 'Dubbel Dogleg (S-kurva)',
};

export const CourseGuideView: React.FC<CourseGuideViewProps> = ({
  course,
  holes,
  activePlayer,
  selectedHoleNum,
  onSelectHole,
  onSaveHoleConfig,
  onSaveCourseMeta,
  onGoToScorecardHole,
}) => {
  const orderedHoles = [...holes].sort((a, b) => a.holeNumber - b.holeNumber);
  const currentHole =
    orderedHoles.find((h) => h.holeNumber === selectedHoleNum) || orderedHoles[0];
  const playerSips = activePlayer.sips[currentHole.holeNumber - 1] ?? 0;
  const isCourseOwner = Boolean(
    course.ownerId && activePlayer?.uid && course.ownerId === activePlayer.uid
  );

  const [isEditingHole, setIsEditingHole] = useState(false);
  const [formState, setFormState] = useState<PubHole>(currentHole);
  const [pendingHoleCoords, setPendingHoleCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [courseTitle, setCourseTitle] = useState(course.title);
  const [courseSubtitle, setCourseSubtitle] = useState(course.subtitle);
  const [courseCity, setCourseCity] = useState(course.city);
  const [courseDate, setCourseDate] = useState(course.eventDate);
  const [courseGameMode, setCourseGameMode] = useState<PubGolfGameMode>(
    course.gameMode === 'brutal' ? 'brutal' : 'single'
  );
  const [courseError, setCourseError] = useState<string | null>(null);

  // Bulk 9-Hole Address & Pub Editor Modal for Course Owner
  const [isEditingBulkAddresses, setIsEditingBulkAddresses] = useState(false);
  const [bulkHolesDraft, setBulkHolesDraft] = useState<PubHole[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [activeAutocompleteHoleNum, setActiveAutocompleteHoleNum] = useState<
    number | null
  >(null);

  const openEditHole = (hole: PubHole) => {
    if (!isCourseOwner) return;
    setFormState({ ...hole });
    setPendingHoleCoords(null);
    setFormError(null);
    setSaveSuccessMsg(null);
    setIsEditingHole(true);
  };

  const openBulkAddressEditor = () => {
    if (!isCourseOwner) return;
    setBulkHolesDraft(orderedHoles.map((h) => ({ ...h })));
    setBulkError(null);
    setActiveAutocompleteHoleNum(null);
    setIsEditingBulkAddresses(true);
  };

  const handleHoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const validation = validateHoleInput(formState);
    if (!validation.valid) {
      setFormError(validation.error || 'Kontrollera fälten.');
      return;
    }

    const cleanedHole: PubHole = {
      ...formState,
      pubName: formState.pubName.trim(),
      pubAddress: formState.pubAddress.trim(),
      drinkName: formState.drinkName.trim(),
      hazardTitle: formState.hazardTitle.trim(),
      hazardRule: formState.hazardRule.trim(),
      caddieTip: formState.caddieTip.trim(),
    };

    if (pendingHoleCoords) {
      const searchQ = buildHoleSearchQuery(cleanedHole, course.city);
      const cacheKey = `${course.courseId}:h${cleanedHole.holeNumber}:${searchQ.toLowerCase()}`;
      primeResolvedPubStopCache(cacheKey, pendingHoleCoords, cleanedHole);
    }

    await onSaveHoleConfig(cleanedHole);
    setIsEditingHole(false);
    setSaveSuccessMsg(
      `Hål ${cleanedHole.holeNumber} (${cleanedHole.pubName}) och dess adress har sparats!`
    );
  };

  const handleBulkAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isCourseOwner) return;
    setBulkError(null);

    for (const draft of bulkHolesDraft) {
      const check = validateHoleInput(draft);
      if (!check.valid) {
        setBulkError(`Hål ${draft.holeNumber}: ${check.error}`);
        return;
      }
    }

    setBulkSaving(true);
    try {
      for (const draft of bulkHolesDraft) {
        const orig = orderedHoles.find((h) => h.holeNumber === draft.holeNumber);
        const changed =
          !orig ||
          orig.pubName !== draft.pubName.trim() ||
          orig.pubAddress !== draft.pubAddress.trim() ||
          orig.drinkName !== draft.drinkName.trim() ||
          orig.par !== draft.par;

        if (changed) {
          await onSaveHoleConfig({
            ...draft,
            pubName: draft.pubName.trim(),
            pubAddress: draft.pubAddress.trim(),
            drinkName: draft.drinkName.trim(),
            hazardTitle: draft.hazardTitle.trim(),
            hazardRule: draft.hazardRule.trim(),
            caddieTip: draft.caddieTip.trim(),
          });
        }
      }
      setIsEditingBulkAddresses(false);
      setSaveSuccessMsg('Pubar och gatuadresser för rundans hål har uppdaterats på kartan!');
    } finally {
      setBulkSaving(false);
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCourseError(null);
    if (courseTitle.trim().length < 2 || courseTitle.trim().length > 80) {
      setCourseError('Banans namn måste vara mellan 2 och 80 tecken.');
      return;
    }
    if (courseCity.trim().length < 2 || courseCity.trim().length > 60) {
      setCourseError('Stad måste vara mellan 2 och 60 tecken.');
      return;
    }
    if (courseDate.trim().length < 4 || courseDate.trim().length > 40) {
      setCourseError('Datum måste anges (4–40 tecken).');
      return;
    }
    await onSaveCourseMeta({
      ...course,
      title: courseTitle.trim(),
      subtitle: courseSubtitle.trim() || 'Officiell Pubgolfbana',
      city: courseCity.trim(),
      eventDate: courseDate.trim(),
      gameMode: courseGameMode,
    });
    setIsEditingCourse(false);
    setSaveSuccessMsg(
      `Banans tävlingsinformation och spelform (${
        courseGameMode === 'brutal' ? 'Brutal Ball · Lag 2 & 2' : 'Single Ball'
      }) har sparats!`
    );
  };

  return (
    <div className="space-y-8">
      {/* Course Guide Hero Header */}
      <div className="overflow-hidden rounded-2xl border border-[#112218]/15 bg-[#112218] text-[#F6F4EE] shadow-xs">
        <div className="grid grid-cols-1 items-stretch lg:grid-cols-12">
          <div className="flex flex-col justify-between p-6 sm:p-8 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#F6F4EE]/70">
                <span>OFFICIELL BANGUIDE & RUTTKARTA</span>
                <span aria-hidden="true">·</span>
                <span>{course.city}</span>
                <span aria-hidden="true">·</span>
                <span>{course.eventDate}</span>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="course-guide-gamemode-badge"
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono-tabular text-[11px] font-bold ${
                    course.gameMode === 'brutal'
                      ? 'bg-[#D4AF37] text-[#112218]'
                      : 'border border-white/25 bg-white/10 text-white'
                  }`}
                >
                  {course.gameMode === 'brutal' ? (
                    <>
                      <Users className="h-3 w-3" />
                      BRUTAL BALL (LAG 2 & 2)
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      SINGLE BALL (INDIVIDUELL)
                    </>
                  )}
                </span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-[#F6F4EE] sm:text-4xl">
                {course.title}
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#F6F4EE]/80">
                {course.subtitle}. Varje pub utgör ett unikt golfhål med egen gatuadress, dryck,
                volym och par — och nedan ser du hela promenadrutten mellan pubarna på Google Maps.
              </p>
            </div>

            {isCourseOwner ? (
              <div className="mt-6 flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => openEditHole(currentHole)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-2 text-xs font-bold text-[#112218] transition-colors hover:bg-[#E5C158] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Edit3 className="h-4 w-4" />
                  Anpassa Hål {currentHole.holeNumber} (Pub, Adress & Par)
                </button>
                <button
                  type="button"
                  onClick={openBulkAddressEditor}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 px-4 py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#D4AF37]/25 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Navigation className="h-4 w-4 text-[#D4AF37]" />
                  Adresser för alla 9 hål
                </button>
                <button
                  type="button"
                  data-testid="open-edit-course-meta-btn"
                  onClick={() => {
                    setCourseTitle(course.title);
                    setCourseSubtitle(course.subtitle);
                    setCourseCity(course.city);
                    setCourseDate(course.eventDate);
                    setCourseGameMode(course.gameMode === 'brutal' ? 'brutal' : 'single');
                    setCourseError(null);
                    setIsEditingCourse(true);
                  }}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-white/20 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Redigera Baninfo & Spelform
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-wrap items-center gap-3 pt-2 text-xs text-[#F6F4EE]/75">
                <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5">
                  Banarkitekt: <strong className="text-white">{course.ownerName}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="relative min-h-[200px] bg-[#0B1E14] lg:col-span-5">
            <img
              src={COURSE_AERIAL_IMG}
              alt="Översiktsvy av Pubgolf Links pubgolfbana"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-90"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#112218] via-transparent to-transparent lg:bg-gradient-to-r" />
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-[#166534]/30 bg-[#166534]/10 px-4 py-3 text-sm font-medium text-[#14532D]"
        >
          <span>{saveSuccessMsg}</span>
          <button
            type="button"
            aria-label="Stäng meddelande"
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs underline"
          >
            Stäng
          </button>
        </div>
      )}

      {/* 9-Hole Selector Tabs */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
        {orderedHoles.map((hole) => {
          const isSelected = hole.holeNumber === currentHole.holeNumber;
          return (
            <button
              key={hole.holeNumber}
              type="button"
              onClick={() => {
                onSelectHole(hole.holeNumber);
                setIsEditingHole(false);
              }}
              className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#112218] bg-[#112218] text-[#F6F4EE] shadow-xs'
                  : 'border-[#112218]/15 bg-white text-[#112218] hover:bg-[#112218]/5'
              }`}
            >
              <span className="font-mono-tabular text-xs font-bold">HÅL {hole.holeNumber}</span>
              <span
                className={`mt-0.5 text-[11px] font-medium truncate max-w-full ${
                  isSelected ? 'text-[#D4AF37]' : 'text-[#112218]/65'
                }`}
              >
                Par {hole.par} · {hole.volumeCl}cl
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Hole Yardage Book Detail + Visual Map */}
      <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Left 7 Cols: Detailed Yardage Card & Course Architect Editor */}
        <div className="flex flex-col justify-between rounded-2xl border border-[#112218]/15 bg-white p-6 shadow-xs lg:col-span-7">
          {!isEditingHole || !isCourseOwner ? (
            <>
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#112218]/10 pb-4">
                  <div className="flex items-center gap-2 text-xs text-[#112218]/65">
                    <span className="font-mono-tabular font-bold text-[#166534]">
                      HÅL {currentHole.holeNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>PAR {currentHole.par}</span>
                    <span aria-hidden="true">·</span>
                    <span>{currentHole.lengthMeters} METER</span>
                    <span aria-hidden="true">·</span>
                    <span>{SHAPE_LABELS[currentHole.shape]}</span>
                  </div>

                  {isCourseOwner && (
                    <button
                      type="button"
                      onClick={() => openEditHole(currentHole)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#112218]/15 px-3 py-1.5 text-xs font-semibold text-[#112218] hover:bg-[#F6F4EE] cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Ändra pub / adress / par
                    </button>
                  )}
                </div>

                <h3 className="mt-4 font-display text-2xl font-bold text-[#112218] sm:text-3xl">
                  {currentHole.pubName}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#112218]/70">
                  <MapPin className="h-4 w-4 shrink-0 text-[#166534]" />
                  {currentHole.pubAddress}
                </p>

                {/* Drink & Par Specification Grid */}
                <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-[#112218]/10 bg-[#F6F4EE] p-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-[#112218]/60">BESTÄMD DRYCK</div>
                    <div className="mt-1 flex items-center gap-1.5 font-semibold text-[#112218]">
                      <Beer className="h-4 w-4 text-[#B8860B]" />
                      {currentHole.drinkName}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#112218]/60">DRYCKESTYP & VOLYM</div>
                    <div className="mt-1 font-mono-tabular font-semibold text-[#112218]">
                      {currentHole.volumeCl} cl · {DRINK_TYPE_LABELS[currentHole.drinkType]}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#112218]/60">PAR FÖR HÅLET</div>
                    <div className="mt-1 font-mono-tabular text-lg font-bold text-[#166534]">
                      Par {currentHole.par} ({currentHole.par} klunkar)
                    </div>
                  </div>
                </div>

                {/* Caddie's Strategy & Pub Hazard */}
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-[#112218]/10 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#166534]">
                      <Compass className="h-4 w-4" />
                      CADDIENS SPELSTRATEGI
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#112218]/85">
                      {currentHole.caddieTip}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#9A3412]/25 bg-[#9A3412]/5 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#9A3412]">
                      <AlertTriangle className="h-4 w-4" />
                      BANHINDER: {currentHole.hazardTitle.toUpperCase()}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#112218]/85">
                      {currentHole.hazardRule}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Bar at bottom of Banguide card */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#112218]/10 pt-4">
                <div className="flex items-center gap-2.5 text-xs text-[#112218]/75">
                  <GolferAvatar
                    avatarSeed={activePlayer.avatarSeed}
                    displayName={activePlayer.displayName}
                    size="xs"
                  />
                  <span>
                    <strong className="text-[#112218]">{activePlayer.displayName}:</strong>{' '}
                    <strong className="font-mono-tabular text-[#112218]">
                      {playerSips > 0 ? `${playerSips} klunkar` : 'Ej spelat ännu'}
                    </strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onGoToScorecardHole(currentHole.holeNumber)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-[#112218] px-4 py-2 text-xs font-semibold text-[#F6F4EE] transition-colors hover:bg-[#163826] cursor-pointer"
                >
                  <Flag className="h-4 w-4 text-[#D4AF37]" />
                  Fyll i scorekort för Hål {currentHole.holeNumber}
                </button>
              </div>
            </>
          ) : (
            /* Course Architect Editor Form for Current Hole */
            <form onSubmit={handleHoleSubmit} className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#112218]/10 pb-3">
                <div>
                  <span className="text-xs font-bold text-[#166534]">
                    BANARKITEKT · HÅL {formState.holeNumber}
                  </span>
                  <h3 className="font-display text-xl font-bold text-[#112218]">
                    Bestäm pub, adress, dryck och par för Hål {formState.holeNumber}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingHole(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#112218]/15 text-[#112218] hover:bg-[#F6F4EE]"
                  aria-label="Avbryt redigering"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#991B1B]/30 bg-[#991B1B]/10 px-4 py-2.5 text-xs font-semibold text-[#991B1B]"
                >
                  {formError}
                </div>
              )}

              {/* Google Maps Places Autocomplete for Pub Name & Street Address */}
              <PubPlaceAutocomplete
                city={course.city}
                holeNumber={formState.holeNumber}
                onSelectPlace={(selected) => {
                  setFormState((prev) => ({
                    ...prev,
                    pubName: selected.pubName || prev.pubName,
                    pubAddress: selected.pubAddress || prev.pubAddress,
                  }));
                  if (selected.location) {
                    setPendingHoleCoords(selected.location);
                  }
                }}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="hole-pub-name"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Pubens namn (Hålets namn)
                  </label>
                  <input
                    id="hole-pub-name"
                    type="text"
                    value={formState.pubName}
                    onChange={(e) => setFormState({ ...formState, pubName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hole-pub-address"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Gatuadress (används för Google Maps-rutten)
                  </label>
                  <input
                    id="hole-pub-address"
                    type="text"
                    value={formState.pubAddress}
                    onChange={(e) => setFormState({ ...formState, pubAddress: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hole-drink-name"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Dryck på hålet
                  </label>
                  <input
                    id="hole-drink-name"
                    type="text"
                    value={formState.drinkName}
                    onChange={(e) => setFormState({ ...formState, drinkName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hole-drink-type"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Dryckeskategori
                  </label>
                  <select
                    id="hole-drink-type"
                    value={formState.drinkType}
                    onChange={(e) =>
                      setFormState({ ...formState, drinkType: e.target.value as DrinkCategory })
                    }
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  >
                    {VALID_DRINK_TYPES.map((dt) => (
                      <option key={dt} value={dt}>
                        {DRINK_TYPE_LABELS[dt]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="hole-par" className="block text-xs font-semibold text-[#112218]">
                    Par (Antal klunkar/svep, 1–6)
                  </label>
                  <input
                    id="hole-par"
                    type="number"
                    min={1}
                    max={6}
                    value={formState.par}
                    onChange={(e) =>
                      setFormState({ ...formState, par: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 font-mono-tabular text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hole-volume"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Volym (cl, 2–100)
                  </label>
                  <input
                    id="hole-volume"
                    type="number"
                    min={2}
                    max={100}
                    value={formState.volumeCl}
                    onChange={(e) =>
                      setFormState({ ...formState, volumeCl: parseInt(e.target.value, 10) || 0 })
                    }
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 font-mono-tabular text-sm text-[#112218]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="hole-shape"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Visuell golfhålsform
                  </label>
                  <select
                    id="hole-shape"
                    value={formState.shape}
                    onChange={(e) =>
                      setFormState({ ...formState, shape: e.target.value as FairwayShape })
                    }
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  >
                    {VALID_SHAPES.map((sh) => (
                      <option key={sh} value={sh}>
                        {SHAPE_LABELS[sh]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="hole-length"
                    className="block text-xs font-semibold text-[#112218]"
                  >
                    Hålets längd i meter (50–650m)
                  </label>
                  <input
                    id="hole-length"
                    type="number"
                    min={50}
                    max={650}
                    value={formState.lengthMeters}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        lengthMeters: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 font-mono-tabular text-sm text-[#112218]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="hole-hazard-title"
                  className="block text-xs font-semibold text-[#112218]"
                >
                  Banhinder (t.ex. Garderobskö-bunkern)
                </label>
                <input
                  id="hole-hazard-title"
                  type="text"
                  value={formState.hazardTitle}
                  onChange={(e) => setFormState({ ...formState, hazardTitle: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                />
              </div>

              <div>
                <label
                  htmlFor="hole-hazard-rule"
                  className="block text-xs font-semibold text-[#112218]"
                >
                  Lokal regel / Pliktslag på hålet
                </label>
                <input
                  id="hole-hazard-rule"
                  type="text"
                  value={formState.hazardRule}
                  onChange={(e) => setFormState({ ...formState, hazardRule: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                />
              </div>

              <div>
                <label
                  htmlFor="hole-caddie-tip"
                  className="block text-xs font-semibold text-[#112218]"
                >
                  Caddiens tips
                </label>
                <textarea
                  id="hole-caddie-tip"
                  rows={2}
                  value={formState.caddieTip}
                  onChange={(e) => setFormState({ ...formState, caddieTip: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#112218]/10 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditingHole(false)}
                  className="rounded-xl border border-[#112218]/20 px-4 py-2 text-xs font-semibold text-[#112218]"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#112218] px-5 py-2 text-xs font-semibold text-[#F6F4EE] hover:bg-[#163826] cursor-pointer"
                >
                  <Check className="h-4 w-4 text-[#D4AF37]" />
                  Spara Hål {formState.holeNumber}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right 5 Cols: Live Preview of Hole Visual SVG */}
        <div className="lg:col-span-5">
          <HoleVisualMap
            hole={isEditingHole ? formState : currentHole}
            playerSips={playerSips}
          />
        </div>
      </div>

      {/* Interactive Google Maps Route Map Between Every Pub */}
      <PubRouteMap
        course={course}
        holes={orderedHoles}
        selectedHoleNum={currentHole.holeNumber}
        onSelectHole={(num) => {
          onSelectHole(num);
          setIsEditingHole(false);
        }}
        isCourseOwner={isCourseOwner}
        onOpenEditHole={(h) => {
          onSelectHole(h.holeNumber);
          openEditHole(h);
        }}
        onOpenBulkAddressModal={openBulkAddressEditor}
      />

      {/* Full 9-Hole Overview Section (Mobile Cards + Desktop Table) */}
      <div className="rounded-2xl border border-[#112218]/15 bg-white p-4 sm:p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg sm:text-xl font-bold text-[#112218]">
              Samtliga 9 Pubhål i Banarkitekturen
            </h3>
            <p className="mt-0.5 text-xs text-[#112218]/65">
              {isCourseOwner
                ? 'Tryck på ett hål för att granska dess fairway eller ändra pub, adress, dryck och par.'
                : 'Tryck på ett hål för att granska dess fairway, adress, dryck, par och lokala hinder.'}
            </p>
          </div>
          {isCourseOwner && (
            <button
              type="button"
              onClick={openBulkAddressEditor}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#112218]/20 bg-[#F6F4EE] px-3.5 py-2 text-xs font-semibold text-[#112218] hover:bg-[#112218] hover:text-white transition cursor-pointer"
            >
              <Navigation className="h-3.5 w-3.5 text-[#166534]" />
              Snabbredigera alla 9 pubadresser
            </button>
          )}
        </div>

        {/* Mobile Zero-Scroll Hole List (md:hidden) */}
        <div className="mt-4 space-y-2.5 md:hidden">
          {orderedHoles.map((h) => {
            const isSelected = h.holeNumber === currentHole.holeNumber;
            return (
              <div
                key={h.holeNumber}
                onClick={() => onSelectHole(h.holeNumber)}
                className={`rounded-xl border p-3.5 transition cursor-pointer ${
                  isSelected
                    ? 'border-[#166534] bg-[#166534]/5'
                    : 'border-[#112218]/15 bg-[#F6F4EE]/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tabular text-xs font-bold text-[#166534]">
                        HÅL #{h.holeNumber}
                      </span>
                      <span className="rounded bg-[#112218] px-2 py-0.5 font-mono-tabular text-[10px] font-bold text-[#F6F4EE]">
                        Par {h.par} · {h.volumeCl}cl
                      </span>
                    </div>
                    <div className="mt-1 font-semibold text-sm text-[#112218] truncate">
                      {h.pubName}
                    </div>
                    <div className="text-xs text-[#112218]/65 truncate">
                      {h.drinkName} · {h.pubAddress}
                    </div>
                  </div>

                  {isCourseOwner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectHole(h.holeNumber);
                        openEditHole(h);
                      }}
                      className="shrink-0 rounded-lg border border-[#112218]/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#112218]"
                    >
                      Ändra
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table (hidden on mobile) */}
        <div className="hidden md:block mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#112218]/15 bg-[#F6F4EE] text-xs font-semibold text-[#112218]">
                <th className="py-2.5 pl-3 pr-2">HÅL</th>
                <th className="px-3 py-2.5">PUB & GATUADRESS</th>
                <th className="px-3 py-2.5">DRYCK</th>
                <th className="px-3 py-2.5 font-mono-tabular">VOLYM</th>
                <th className="px-3 py-2.5 font-mono-tabular">PAR</th>
                <th className="px-3 py-2.5">BANPROFIL</th>
                {isCourseOwner && <th className="py-2.5 pl-2 pr-3 text-right">ÅTGÄRD</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#112218]/10">
              {orderedHoles.map((h) => (
                <tr
                  key={h.holeNumber}
                  onClick={() => onSelectHole(h.holeNumber)}
                  className={`cursor-pointer transition-colors ${
                    h.holeNumber === currentHole.holeNumber
                      ? 'bg-[#166534]/5 font-medium'
                      : 'hover:bg-[#F6F4EE]/60'
                  }`}
                >
                  <td className="py-3 pl-3 pr-2 font-mono-tabular font-bold text-[#166534]">
                    #{h.holeNumber}
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-[#112218]">{h.pubName}</div>
                    <div className="text-xs text-[#112218]/60">{h.pubAddress}</div>
                  </td>
                  <td className="px-3 py-3 text-[#112218]">{h.drinkName}</td>
                  <td className="px-3 py-3 font-mono-tabular text-[#112218]">{h.volumeCl} cl</td>
                  <td className="px-3 py-3 font-mono-tabular font-bold text-[#112218]">
                    Par {h.par}
                  </td>
                  <td className="px-3 py-3 text-xs text-[#112218]/75">
                    {SHAPE_LABELS[h.shape]} · {h.lengthMeters}m
                  </td>
                  {isCourseOwner && (
                    <td className="py-3 pl-2 pr-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectHole(h.holeNumber);
                          openEditHole(h);
                        }}
                        className="rounded-lg border border-[#112218]/15 bg-white px-2.5 py-1 text-xs font-semibold text-[#112218] hover:bg-[#112218] hover:text-white cursor-pointer"
                      >
                        Ändra hål
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk 9-Hole Pub & Address Setup Modal (Course Owner Only) */}
      {isCourseOwner && isEditingBulkAddresses && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-address-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#112218]/15 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#112218]/10 bg-[#112218] px-5 py-4 text-[#F6F4EE]">
              <div>
                <div className="text-[11px] font-bold text-[#D4AF37]">
                  BANARKITEKT · GOOGLE MAPS ADRESSLISTA (HÅL 1–9)
                </div>
                <h3 id="bulk-address-modal-title" className="font-display text-lg sm:text-xl font-bold text-white">
                  Ange pubnamn & gatuadress för alla 9 hål i {course.city}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Stäng modal"
                onClick={() => setIsEditingBulkAddresses(false)}
                className="rounded-lg p-1.5 text-[#F6F4EE]/70 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleBulkAddressSubmit}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
                {bulkError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#991B1B]/30 bg-[#991B1B]/10 px-4 py-2.5 text-xs font-semibold text-[#991B1B]"
                  >
                    {bulkError}
                  </div>
                )}

                <p className="text-xs text-[#112218]/70">
                  Skriv in pubens namn och gatuadress för varje hål eller klicka på{' '}
                  <strong>Sök på Google Maps</strong> för att hämta exakt gatuadress automatiskt.
                </p>

                {bulkHolesDraft.map((holeDraft, idx) => {
                  const isSearchOpen = activeAutocompleteHoleNum === holeDraft.holeNumber;
                  return (
                    <div
                      key={holeDraft.holeNumber}
                      className="rounded-xl border border-[#112218]/15 bg-[#F6F4EE]/40 p-3.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono-tabular text-xs font-bold text-[#166534]">
                          HÅL {holeDraft.holeNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveAutocompleteHoleNum(
                              isSearchOpen ? null : holeDraft.holeNumber
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-[#166534]/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#166534] hover:bg-[#166534] hover:text-white transition cursor-pointer"
                        >
                          <MapPin className="h-3 w-3" />
                          {isSearchOpen ? 'Dölj Google Maps-sök' : 'Sök pub på Google Maps'}
                        </button>
                      </div>

                      {isSearchOpen && (
                        <div className="mt-2">
                          <PubPlaceAutocomplete
                            compact
                            city={course.city}
                            holeNumber={holeDraft.holeNumber}
                            onSelectPlace={(selected) => {
                              setBulkHolesDraft((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? {
                                        ...item,
                                        pubName: selected.pubName || item.pubName,
                                        pubAddress: selected.pubAddress || item.pubAddress,
                                      }
                                    : item
                                )
                              );
                              if (selected.location) {
                                const updated = {
                                  ...holeDraft,
                                  pubName: selected.pubName || holeDraft.pubName,
                                  pubAddress: selected.pubAddress || holeDraft.pubAddress,
                                };
                                const sq = buildHoleSearchQuery(updated, course.city);
                                const ck = `${course.courseId}:h${updated.holeNumber}:${sq.toLowerCase()}`;
                                primeResolvedPubStopCache(ck, selected.location, updated);
                              }
                              setActiveAutocompleteHoleNum(null);
                            }}
                          />
                        </div>
                      )}

                      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-[#112218]/75">
                            Pubens namn
                          </label>
                          <input
                            type="text"
                            value={holeDraft.pubName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBulkHolesDraft((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, pubName: val } : item
                                )
                              );
                            }}
                            className="mt-0.5 w-full rounded-lg border border-[#112218]/20 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-[#112218]"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[11px] font-semibold text-[#112218]/75">
                            Gatuadress
                          </label>
                          <input
                            type="text"
                            value={holeDraft.pubAddress}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBulkHolesDraft((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, pubAddress: val } : item
                                )
                              );
                            }}
                            className="mt-0.5 w-full rounded-lg border border-[#112218]/20 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-[#112218]"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-semibold text-[#112218]/75">
                            Dryck
                          </label>
                          <input
                            type="text"
                            value={holeDraft.drinkName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBulkHolesDraft((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, drinkName: val } : item
                                )
                              );
                            }}
                            className="mt-0.5 w-full rounded-lg border border-[#112218]/20 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-[#112218]"
                          />
                        </div>

                        <div className="sm:col-span-1">
                          <label className="block text-[11px] font-semibold text-[#112218]/75">
                            Par
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={6}
                            value={holeDraft.par}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10) || 4;
                              setBulkHolesDraft((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, par: val } : item
                                )
                              );
                            }}
                            className="mt-0.5 w-full rounded-lg border border-[#112218]/20 bg-white px-2 py-1.5 font-mono-tabular text-xs sm:text-sm text-[#112218]"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[#112218]/10 bg-[#F6F4EE] px-5 py-3.5">
                <button
                  type="button"
                  onClick={() => setIsEditingBulkAddresses(false)}
                  className="rounded-xl border border-[#112218]/20 bg-white px-4 py-2 text-xs font-semibold text-[#112218]"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={bulkSaving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#112218] px-5 py-2 text-xs font-semibold text-[#F6F4EE] hover:bg-[#163826] disabled:opacity-50 cursor-pointer"
                >
                  <Check className="h-4 w-4 text-[#D4AF37]" />
                  {bulkSaving ? 'Sparar alla hål...' : 'Spara pubar & adresser'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Meta Edit Modal */}
      {isCourseOwner && isEditingCourse && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-course-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-[#112218]/15 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#112218]/10 pb-3">
              <h3 id="edit-course-modal-title" className="font-display text-xl font-bold text-[#112218]">
                Redigera Pubgolfbanans Tävlingsinfo
              </h3>
              <button
                type="button"
                aria-label="Stäng modal"
                onClick={() => setIsEditingCourse(false)}
                className="rounded-lg p-1.5 text-[#112218]/60 hover:bg-[#F6F4EE]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCourseSubmit} className="mt-4 space-y-4">
              {courseError && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#991B1B]/30 bg-[#991B1B]/10 px-4 py-2.5 text-xs font-semibold text-[#991B1B]"
                >
                  {courseError}
                </div>
              )}

              <div>
                <label htmlFor="course-title-input" className="block text-xs font-semibold text-[#112218]">
                  Banans / Mästerskapets Namn
                </label>
                <input
                  id="course-title-input"
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                />
              </div>

              <div>
                <label htmlFor="course-subtitle-input" className="block text-xs font-semibold text-[#112218]">
                  Undertitel / Beskrivning
                </label>
                <input
                  id="course-subtitle-input"
                  type="text"
                  value={courseSubtitle}
                  onChange={(e) => setCourseSubtitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="course-city-input" className="block text-xs font-semibold text-[#112218]">
                    Stad / Område
                  </label>
                  <input
                    id="course-city-input"
                    type="text"
                    value={courseCity}
                    onChange={(e) => setCourseCity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>
                <div>
                  <label htmlFor="course-date-input" className="block text-xs font-semibold text-[#112218]">
                    Datum för rundan
                  </label>
                  <input
                    id="course-date-input"
                    type="text"
                    value={courseDate}
                    onChange={(e) => setCourseDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#112218]/20 bg-[#F6F4EE]/50 px-3 py-2 text-sm text-[#112218]"
                  />
                </div>
              </div>

              {/* Game Mode Selector (Single Ball vs Brutal Ball) for existing rounds */}
              <div>
                <span className="block text-xs font-semibold text-[#112218]">
                  Spelform för rundan
                </span>
                <div className="mt-1.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    data-testid="edit-course-gamemode-single"
                    onClick={() => setCourseGameMode('single')}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      courseGameMode === 'single'
                        ? 'border-[#166534] bg-[#166534]/8 ring-2 ring-[#166534]'
                        : 'border-[#112218]/15 bg-[#F6F4EE]/40 hover:bg-[#F6F4EE]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-display text-sm font-bold text-[#112218]">
                      <User className="h-4 w-4 text-[#166534]" />
                      Single Ball
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-[#112218]/70">
                      Klassisk individuell pubgolf. Varje spelare tävlar för sig själv på leaderboarden.
                    </p>
                  </button>

                  <button
                    type="button"
                    data-testid="edit-course-gamemode-brutal"
                    onClick={() => setCourseGameMode('brutal')}
                    className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition cursor-pointer ${
                      courseGameMode === 'brutal'
                        ? 'border-[#166534] bg-[#166534]/8 ring-2 ring-[#166534]'
                        : 'border-[#112218]/15 bg-[#F6F4EE]/40 hover:bg-[#F6F4EE]'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-display text-sm font-bold text-[#112218]">
                      <Users className="h-4 w-4 text-[#B8860B]" />
                      Brutal Ball (Lag 2 & 2)
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-[#112218]/70">
                      Lag om 2 & 2 där lagets score är bådas singelscore ihoplagt. Lag-tabell + individuell tabell.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#112218]/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingCourse(false)}
                  className="rounded-xl border border-[#112218]/20 px-4 py-2 text-xs font-semibold text-[#112218]"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#112218] px-5 py-2 text-xs font-semibold text-[#F6F4EE] hover:bg-[#163826]"
                >
                  Spara Baninfo & Spelform
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
