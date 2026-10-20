import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Bot,
  BookOpen,
  BookOpenText,
  Camera,
  FileQuestion,
  Flag,
  GraduationCap,
  Mic,
  NotebookPen,
  RotateCcw,
  Theater,
  Trophy,
} from "lucide-react";
import {
  useGetDailyPackQuery,
  useGetLearningProgressQuery,
  useGetVocabularyStatsQuery,
} from "../../store/slices/learningSlice";

/**
 * The app's AI Study hub (study_hub.dart), laid out the same way. Tiles whose
 * feature exists on the website open it; the rest are marked "In the app" and
 * lead to /download rather than to a page that is not there.
 */

type Group = "talk" | "practice" | "prep";

interface Tile {
  key: string;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ className?: string }>;
  group: Group;
  /** Web route, when the website has the feature. */
  to?: string;
}

const TILES: Tile[] = [
  { key: "tutor", title: "AI Tutor", subtitle: "Chat about anything", Icon: Bot, group: "talk" },
  { key: "roleplay", title: "Roleplay", subtitle: "Real-life scenes", Icon: Theater, group: "talk" },
  { key: "story", title: "Story", subtitle: "Write a story together", Icon: BookOpenText, group: "talk" },
  { key: "photo", title: "Photo", subtitle: "Learn words from a photo", Icon: Camera, group: "talk" },
  { key: "speak", title: "Speak", subtitle: "Pronunciation check", Icon: Mic, group: "practice" },
  { key: "review", title: "Review", subtitle: "Words due today", Icon: RotateCcw, group: "practice", to: "/learn/review" },
  { key: "writing", title: "Writing", subtitle: "Grammar feedback", Icon: NotebookPen, group: "practice" },
  { key: "quizzes", title: "Quizzes", subtitle: "Quick AI quizzes", Icon: FileQuestion, group: "practice" },
  { key: "exam", title: "Exam prep", subtitle: "TOPIK, JLPT, IELTS…", Icon: GraduationCap, group: "prep" },
  { key: "lessons", title: "Lessons", subtitle: "Step-by-step units", Icon: BookOpen, group: "prep", to: "/learn/lessons" },
  { key: "challenges", title: "Challenges", subtitle: "Daily goals for XP", Icon: Flag, group: "prep" },
  { key: "leaderboard", title: "Leaderboard", subtitle: "See this week's ranks", Icon: Trophy, group: "prep", to: "/learn/leaderboard" },
];

const GROUPS: { key: Group; label: string; text: string; fill: string }[] = [
  { key: "talk", label: "Talk", text: "text-[#6D3FE0] dark:text-[#B9A0F0]", fill: "bg-[#EFE9FE] dark:bg-[#6D3FE0]/20" },
  { key: "practice", label: "Practice", text: "text-[#00786A] dark:text-[#73C2B8]", fill: "bg-[#DDF5EF] dark:bg-[#00786A]/20" },
  { key: "prep", label: "Prepare & compete", text: "text-[#A85E00] dark:text-[#D9A866]", fill: "bg-[#FEF0D9] dark:bg-[#A85E00]/20" },
];

const CEFR = /^[ABC][12]$/;

const unwrap = (r: any) => (r && r.data !== undefined ? r.data : r) || {};

const StudyHub: React.FC = () => {
  const { t, i18n } = useTranslation();
  const tr = (key: string, fallback: string, opts?: any) => t(key, opts) || fallback;
  const user = useSelector((state: any) => state.auth.userInfo?.user);
  const signedIn = !!user?._id;

  const { data: progressRaw } = useGetLearningProgressQuery(undefined, { skip: !signedIn });
  const { data: statsRaw } = useGetVocabularyStatsQuery(undefined, { skip: !signedIn });
  const { data: packRaw, isLoading: packLoading } = useGetDailyPackQuery(
    (i18n && i18n.language) || "en",
    { skip: !signedIn }
  );

  const progress = unwrap(progressRaw);
  const stats = unwrap(statsRaw);
  const pack = unwrap(packRaw);

  const language = Array.isArray(user?.language_to_learn)
    ? user.language_to_learn[0]
    : user?.language_to_learn;
  const level = pack.servedLevel || pack.requestedLevel;
  const dueToday = Number(stats.dueToday) || 0;

  const chips: string[] = [];
  if (Number(progress.currentStreak) > 0)
    chips.push(tr("studyHub.streak", `${progress.currentStreak} day streak`, { count: progress.currentStreak }));
  if (progress.level) chips.push(tr("studyHub.level", `Lv ${progress.level}`, { level: progress.level }));
  if (language) chips.push(CEFR.test(level || "") ? `${language} · ${level}` : String(language));

  const packTopic = pack.theme && pack.theme.topic;
  const packDone = !!pack.packComplete;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-canvas-dark">
      {/* Header */}
      <header className="bg-gradient-to-br from-[#667EEA] to-[#764BA2] px-4 pb-6 pt-6 text-white dark:from-[#1A1A2E] dark:to-[#16213E]">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-extrabold">{tr("studyHub.title", "AI Study")}</h1>
          {chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <li key={chip} className="rounded-full bg-white/20 px-3.5 py-1 text-sm font-medium">
                  {chip}
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 px-3 py-4">
        {!signedIn && (
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-cardbg-dark">
            <p className="text-gray-700 dark:text-gray-200">
              {tr("studyHub.signIn", "Sign in to see your streak, level and today's pack.")}
            </p>
            <Link to="/login" className="mt-3 inline-block rounded-full bg-[#764BA2] px-5 py-2 text-sm font-semibold text-white">
              {tr("login", "Log in")}
            </Link>
          </div>
        )}

        {/* Today's pack */}
        {signedIn && !packLoading && (
          <div className="flex min-h-[72px] items-center gap-3 rounded-2xl bg-gradient-to-r from-[#667EEA] to-[#764BA2] px-5 py-4 text-white">
            <div className="min-w-0 flex-1">
              {pack.needsLanguage ? (
                <p className="text-lg font-bold">{tr("studyHub.pack.needsLanguage", "What are you learning?")}</p>
              ) : packDone ? (
                <p className="text-lg font-bold">✓ {tr("studyHub.pack.done", "Done for today")}</p>
              ) : packTopic ? (
                <>
                  <p className="text-sm text-white/75">{tr("studyHub.pack.caption", "Today's pack")}</p>
                  <p className="truncate text-xl font-bold">{packTopic}</p>
                </>
              ) : (
                <p className="text-sm">
                  {tr("studyHub.pack.preparing", "Today's items are still being prepared. Check back soon.")}
                </p>
              )}
            </div>
            {pack.needsLanguage ? (
              <Link to="/settings/language" className="shrink-0 rounded-full bg-[#FFF35C] px-6 py-2.5 font-semibold text-gray-900">
                {tr("studyHub.pack.choose", "Choose")}
              </Link>
            ) : (
              packTopic &&
              !packDone && (
                <Link to="/download" className="shrink-0 rounded-full bg-[#FFF35C] px-6 py-2.5 font-semibold text-gray-900">
                  {tr("studyHub.pack.start", "Start")}
                </Link>
              )
            )}
          </div>
        )}

        {/* Vocabulary packs */}
        <div className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#0EA5E9] to-[#14B8A6] p-5 text-white">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl" aria-hidden>
            📚
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold">{tr("studyHub.vocabPacks.title", "Vocabulary Packs")}</p>
            <p className="mt-1 text-sm text-white/85">
              {tr("studyHub.vocabPacks.body", "Ready-made word sets by topic. Add one and learn a little every day.")}
            </p>
            <Link
              to="/learn/vocabulary"
              className="mt-3 inline-block rounded-full bg-white px-5 py-1.5 text-sm font-bold text-[#0E7490]"
            >
              {tr("studyHub.vocabPacks.browse", "Browse packs")}
            </Link>
          </div>
        </div>

        {/* Feature groups */}
        {GROUPS.map((group) => (
          <section key={group.key} className="pt-3">
            <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-[0.12em] text-gray-800 dark:text-gray-200">
              {tr(`studyHub.groups.${group.key}`, group.label)}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TILES.filter((tile) => tile.group === group.key).map((tile) => {
                const badge =
                  tile.key === "review" && dueToday > 0
                    ? String(dueToday)
                    : !tile.to
                    ? tr("home.features.inApp", "In the app")
                    : null;
                return (
                  <Link
                    key={tile.key}
                    to={tile.to || "/download"}
                    className="flex min-h-[64px] items-center gap-3 rounded-[14px] border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-cardbg-dark"
                  >
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${group.fill} ${group.text}`}>
                      <tile.Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-base font-bold text-gray-900 dark:text-gray-50">
                          {tr(`studyHub.tiles.${tile.key}.title`, tile.title)}
                        </span>
                        {badge && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              tile.key === "review" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300"
                            }`}
                          >
                            {badge}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-sm text-gray-600 dark:text-gray-300">
                        {tr(`studyHub.tiles.${tile.key}.subtitle`, tile.subtitle)}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
};

export default StudyHub;
