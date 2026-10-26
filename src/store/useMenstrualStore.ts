import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface CycleSettings {
  lastPeriodStart: string; // YYYY-MM-DD or '' if not entered yet
  hasUserEnteredData?: boolean;
  previousPeriodStart?: string; // Stored to allow instant undo/revert if clicked by mistake
  cycleLength: number; // default 28 days
  periodDuration: number; // default 5 days
  lutealLength: number; // default 14 days
  notificationsEnabled: boolean;
}

export interface PeriodEntry {
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  flow?: 'spotting' | 'light' | 'medium' | 'heavy';
}

export interface DailySymptomLog {
  date: string; // YYYY-MM-DD
  isPeriod?: boolean;
  flow?: 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
  moods: string[];
  symptoms: string[];
  discharge?: string;
  sex?: string[];
  notes?: string;
}

export interface CycleDayInfo {
  cycleDay: number;
  phase: CyclePhase;
  phaseTitle: string;
  phaseDescription: string;
  fertilityChance: 'High' | 'Medium' | 'Low';
  daysUntilNextPeriod: number;
  nextPeriodDate: string;
  isPeriodActive: boolean;
  themeColor: string;
  badgeEmoji: string;
  isInitialized: boolean;
}

export const formatYMD = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseYMD = (str: string): Date => {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
};

export const getDaysDiff = (startStr: string, endStr: string): number => {
  const d1 = parseYMD(startStr);
  const d2 = parseYMD(endStr);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

export const calculateCycleInfo = (
  targetDateStr: string,
  settings?: CycleSettings,
  logs: Record<string, DailySymptomLog> = {}
): CycleDayInfo => {
  // If user has not started or provided any last period date yet, or hasUserEnteredData is false, keep empty at Day 0
  const isUntracked =
    !settings ||
    settings.hasUserEnteredData === false ||
    !settings.lastPeriodStart ||
    settings.lastPeriodStart.trim() === '';

  if (isUntracked) {
    return {
      cycleDay: 0,
      phase: 'menstrual',
      phaseTitle: 'No Cycle Data',
      phaseDescription: 'Start logging your period or set your last period date to begin tracking.',
      fertilityChance: 'Low',
      daysUntilNextPeriod: 0,
      nextPeriodDate: '--',
      isPeriodActive: false,
      themeColor: '#64748B',
      badgeEmoji: '🌸',
      isInitialized: false,
    };
  }

  const diff = getDaysDiff(settings.lastPeriodStart, targetDateStr);
  const todayStr = formatYMD(new Date());
  const isPastOrToday = targetDateStr <= todayStr;
  const dayLog = logs[targetDateStr];
  const hasLoggedPeriod = Boolean(dayLog && dayLog.isPeriod && dayLog.flow !== 'none');

  // Overdue check: past cycle length without a logged period
  const isOverdue = isPastOrToday && diff >= settings.cycleLength && !hasLoggedPeriod;

  const cycleDay = isOverdue
    ? diff + 1
    : ((diff % settings.cycleLength) + settings.cycleLength) % settings.cycleLength + 1;

  let phase: CyclePhase = 'follicular';
  let phaseTitle = 'Follicular Phase';
  let phaseDescription = 'Estrogen rising • Energy & mental sharpness boost';
  let fertilityChance: 'High' | 'Medium' | 'Low' = 'Low';
  let themeColor = '#A855F7'; // Violet/Purple
  let badgeEmoji = '🌱';

  const ovulationPeakDay = Math.max(1, settings.cycleLength - 14);
  const fertileStart = Math.max(settings.periodDuration + 1, ovulationPeakDay - 4);
  const fertileEnd = Math.min(settings.cycleLength, ovulationPeakDay + 1);

  if (isOverdue) {
    const daysLate = diff - settings.cycleLength + 1;
    phase = 'luteal';
    phaseTitle = `Period Late (${daysLate}d)`;
    phaseDescription = `Expected ${daysLate} day${daysLate > 1 ? 's' : ''} ago • Log your flow if started or track symptoms`;
    fertilityChance = 'Low';
    themeColor = '#E11D48';
    badgeEmoji = '⏳';
  } else if (cycleDay <= settings.periodDuration) {
    phase = 'menstrual';
    phaseTitle = 'Menstrual Phase';
    phaseDescription = 'Period active • Prioritize warm hydration, rest & iron-rich foods';
    fertilityChance = 'Low';
    themeColor = '#F43F5E'; // Rose Pink
    badgeEmoji = '🌸';
  } else if (cycleDay >= fertileStart && cycleDay <= fertileEnd) {
    phase = 'ovulation';
    phaseTitle = cycleDay === ovulationPeakDay ? 'Ovulation Day' : 'Fertile Window';
    phaseDescription = 'Estrogen & LH peak • High vitality, confidence & peak fertility';
    fertilityChance = 'High';
    themeColor = '#FB7185'; // Coral Rose
    badgeEmoji = '✨';
  } else if (cycleDay > fertileEnd) {
    phase = 'luteal';
    phaseTitle = 'Luteal Phase';
    phaseDescription = 'Progesterone peak • Gentle movement, magnesium & mindful pacing';
    fertilityChance = 'Low';
    themeColor = '#E11D48'; // Deep Rose/Plum
    badgeEmoji = '🌙';
  } else {
    phase = 'follicular';
    phaseTitle = 'Follicular Phase';
    phaseDescription = 'Estrogen rising • Great time for creative tasks & workouts';
    fertilityChance = cycleDay >= fertileStart - 2 ? 'Medium' : 'Low';
    themeColor = '#A855F7';
    badgeEmoji = '🌱';
  }

  const daysUntilNextPeriod = isOverdue ? 0 : Math.max(0, settings.cycleLength - cycleDay + 1);
  const targetDateObj = parseYMD(targetDateStr);
  const nextPeriodObj = new Date(targetDateObj);
  nextPeriodObj.setDate(targetDateObj.getDate() + (daysUntilNextPeriod <= 0 && !isOverdue ? settings.cycleLength : daysUntilNextPeriod));
  const nextPeriodDate = formatYMD(nextPeriodObj);

  let isPeriodActive = false;
  if (dayLog && typeof dayLog.isPeriod === 'boolean') {
    isPeriodActive = dayLog.isPeriod && dayLog.flow !== 'none';
  } else {
    isPeriodActive = !isOverdue && phase === 'menstrual';
  }

  return {
    cycleDay,
    phase,
    phaseTitle,
    phaseDescription,
    fertilityChance,
    daysUntilNextPeriod,
    nextPeriodDate,
    isPeriodActive,
    themeColor,
    badgeEmoji,
    isInitialized: true,
  };
};

interface MenstrualState {
  settings: CycleSettings;
  dailyLogs: Record<string, DailySymptomLog>;
  pastPeriods: PeriodEntry[];
  isLoading: boolean;
  loadState: () => Promise<void>;
  updateSettings: (newSettings: Partial<CycleSettings>) => Promise<void>;
  logPeriodToggle: (dateStr: string, flow?: 'spotting' | 'light' | 'medium' | 'heavy') => Promise<void>;
  saveDailyLog: (dateStr: string, log: Partial<DailySymptomLog>) => Promise<void>;
  deleteDailyLog: (dateStr: string) => Promise<void>;
  clearMenstrualData: () => Promise<void>;
}

const STORAGE_KEY = 'selftrack_menstrual_cycle_v2';
const LEGACY_STORAGE_KEY = 'selftrack_menstrual_cycle_v1';

const DEFAULT_SETTINGS: CycleSettings = {
  lastPeriodStart: '',
  hasUserEnteredData: false,
  cycleLength: 28,
  periodDuration: 5,
  lutealLength: 14,
  notificationsEnabled: true,
};

export const useMenstrualStore = create<MenstrualState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  dailyLogs: {},
  pastPeriods: [],
  isLoading: false,

  loadState: async () => {
    try {
      set({ isLoading: true });
      // Remove legacy storage key to purge any old mock/seed data
      try {
        await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {}

      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Only treat as user-entered if explicitly marked true AND has a non-empty period date
        const hasUserEntered = Boolean(
          (parsed.settings?.hasUserEnteredData === true || parsed.hasUserEnteredData === true) &&
          parsed.settings?.lastPeriodStart &&
          parsed.settings.lastPeriodStart.trim() !== ''
        );
        const cleanLastPeriod = hasUserEntered ? parsed.settings.lastPeriodStart : '';
        const cleanSettings = {
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {}),
          lastPeriodStart: cleanLastPeriod,
          hasUserEnteredData: hasUserEntered,
        };
        const cleanPastPeriods = hasUserEntered ? (parsed.pastPeriods || []) : [];
        const cleanDailyLogs = hasUserEntered ? (parsed.dailyLogs || {}) : {};
        set({
          settings: cleanSettings,
          dailyLogs: cleanDailyLogs,
          pastPeriods: cleanPastPeriods,
        });

        // Persist clean sanitized state if storage had unverified data
        if (!hasUserEntered) {
          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              settings: cleanSettings,
              dailyLogs: {},
              pastPeriods: [],
            })
          );
        }
      } else {
        set({
          settings: DEFAULT_SETTINGS,
          dailyLogs: {},
          pastPeriods: [],
        });
      }
    } catch {
      // Use defaults
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings) => {
    const hasData = newSettings.hasUserEnteredData !== undefined
      ? newSettings.hasUserEnteredData
      : Boolean(
          (newSettings.lastPeriodStart && newSettings.lastPeriodStart.trim() !== '') ||
          (newSettings.lastPeriodStart === undefined && get().settings.hasUserEnteredData && get().settings.lastPeriodStart)
        );
    const cleanLast = hasData
      ? (newSettings.lastPeriodStart !== undefined ? newSettings.lastPeriodStart : get().settings.lastPeriodStart)
      : '';
    const updated = {
      ...get().settings,
      ...newSettings,
      lastPeriodStart: cleanLast,
      hasUserEnteredData: hasData,
    };
    set({ settings: updated });
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: updated,
          dailyLogs: get().dailyLogs,
          pastPeriods: get().pastPeriods,
        })
      );
    } catch {}
  },

  logPeriodToggle: async (dateStr, flow = 'medium') => {
    const currentLogs = { ...get().dailyLogs };
    const currentSettings = { ...get().settings };
    const existing = currentLogs[dateStr];

    // Determine current active status
    const currentCycleInfo = calculateCycleInfo(dateStr, currentSettings, currentLogs);
    const isCurrentlyPeriod = currentCycleInfo.isPeriodActive;

    const updatedSettings = { ...currentSettings, hasUserEnteredData: true };

    if (!isCurrentlyPeriod) {
      // ── CLICK 1: Start period today ──
      updatedSettings.previousPeriodStart = currentSettings.lastPeriodStart;
      updatedSettings.lastPeriodStart = dateStr;
      updatedSettings.hasUserEnteredData = true;

      currentLogs[dateStr] = {
        date: dateStr,
        moods: existing?.moods || [],
        symptoms: existing?.symptoms || [],
        discharge: existing?.discharge,
        sex: existing?.sex || [],
        notes: existing?.notes,
        isPeriod: true,
        flow: flow || 'medium',
      };
    } else {
      // ── CLICK 2: Turn OFF / Undo / Cancel period ──
      currentLogs[dateStr] = {
        date: dateStr,
        moods: existing?.moods || [],
        symptoms: existing?.symptoms || [],
        discharge: existing?.discharge,
        sex: existing?.sex || [],
        notes: existing?.notes,
        isPeriod: false,
        flow: 'none',
      };

      // If lastPeriodStart was set to this date, revert back to previous start date or empty
      if (currentSettings.lastPeriodStart === dateStr) {
        if (currentSettings.previousPeriodStart && currentSettings.previousPeriodStart !== dateStr) {
          updatedSettings.lastPeriodStart = currentSettings.previousPeriodStart;
        } else {
          updatedSettings.lastPeriodStart = '';
          updatedSettings.hasUserEnteredData = false;
        }
        updatedSettings.previousPeriodStart = undefined;
      }
    }

    set({ dailyLogs: currentLogs, settings: updatedSettings });
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: updatedSettings,
          dailyLogs: currentLogs,
          pastPeriods: get().pastPeriods,
        })
      );
    } catch {}
  },

  saveDailyLog: async (dateStr, logUpdates) => {
    const currentLogs = { ...get().dailyLogs };
    const existing = currentLogs[dateStr] || {
      date: dateStr,
      moods: [],
      symptoms: [],
      sex: [],
    };

    currentLogs[dateStr] = {
      ...existing,
      ...logUpdates,
      date: dateStr,
    };

    set({ dailyLogs: currentLogs });
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: get().settings,
          dailyLogs: currentLogs,
          pastPeriods: get().pastPeriods,
        })
      );
    } catch {}
  },

  deleteDailyLog: async (dateStr) => {
    const currentLogs = { ...get().dailyLogs };
    delete currentLogs[dateStr];
    set({ dailyLogs: currentLogs });
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          settings: get().settings,
          dailyLogs: currentLogs,
          pastPeriods: get().pastPeriods,
        })
      );
    } catch {}
  },

  clearMenstrualData: async () => {
    set({
      settings: DEFAULT_SETTINGS,
      dailyLogs: {},
      pastPeriods: [],
    });
    try {
      await AsyncStorage.multiRemove([STORAGE_KEY, LEGACY_STORAGE_KEY]);
    } catch {}
  },
}));
