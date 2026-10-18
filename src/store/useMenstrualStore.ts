import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

export interface CycleSettings {
  lastPeriodStart: string; // YYYY-MM-DD
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
  settings: CycleSettings,
  logs: Record<string, DailySymptomLog> = {}
): CycleDayInfo => {
  const diff = getDaysDiff(settings.lastPeriodStart, targetDateStr);
  const cycleDay = ((diff % settings.cycleLength) + settings.cycleLength) % settings.cycleLength + 1;

  let phase: CyclePhase = 'follicular';
  let phaseTitle = 'Follicular Phase';
  let phaseDescription = 'Estrogen rising • Energy & mental sharpness boost';
  let fertilityChance: 'High' | 'Medium' | 'Low' = 'Low';
  let themeColor = '#A855F7'; // Violet/Purple
  let badgeEmoji = '🌱';

  const ovulationPeakDay = Math.max(1, settings.cycleLength - 14);
  const fertileStart = Math.max(settings.periodDuration + 1, ovulationPeakDay - 4);
  const fertileEnd = Math.min(settings.cycleLength, ovulationPeakDay + 1);

  if (cycleDay <= settings.periodDuration) {
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

  const daysUntilNextPeriod = settings.cycleLength - cycleDay + 1;
  const targetDateObj = parseYMD(targetDateStr);
  const nextPeriodObj = new Date(targetDateObj);
  nextPeriodObj.setDate(targetDateObj.getDate() + (daysUntilNextPeriod <= 0 ? settings.cycleLength : daysUntilNextPeriod));
  const nextPeriodDate = formatYMD(nextPeriodObj);

  const dayLog = logs[targetDateStr];
  let isPeriodActive = false;
  if (dayLog && typeof dayLog.isPeriod === 'boolean') {
    isPeriodActive = dayLog.isPeriod && dayLog.flow !== 'none';
  } else {
    isPeriodActive = phase === 'menstrual';
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
}

const STORAGE_KEY = 'selftrack_menstrual_cycle_v1';

// Default last period: 12 days ago from today so today displays Ovulation / Follicular with rich data
const getDefaultLastPeriodStart = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 12);
  return formatYMD(d);
};

const DEFAULT_SETTINGS: CycleSettings = {
  lastPeriodStart: getDefaultLastPeriodStart(),
  cycleLength: 28,
  periodDuration: 5,
  lutealLength: 14,
  notificationsEnabled: true,
};

export const useMenstrualStore = create<MenstrualState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  dailyLogs: {},
  pastPeriods: [
    {
      startDate: getDefaultLastPeriodStart(),
      endDate: formatYMD(new Date(parseYMD(getDefaultLastPeriodStart()).getTime() + 4 * 86400000)),
      flow: 'medium',
    },
  ],
  isLoading: false,

  loadState: async () => {
    try {
      set({ isLoading: true });
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          dailyLogs: parsed.dailyLogs || {},
          pastPeriods: parsed.pastPeriods || get().pastPeriods,
        });
      }
    } catch {
      // Use defaults
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
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

    let updatedSettings = { ...currentSettings };

    if (!isCurrentlyPeriod) {
      // ── CLICK 1: Start period today ──
      // Store current lastPeriodStart in previousPeriodStart for instant undo
      updatedSettings.previousPeriodStart = currentSettings.lastPeriodStart;
      updatedSettings.lastPeriodStart = dateStr;

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
      // Explicitly mark today as non-period
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

      // If lastPeriodStart was set to this date, revert back to previous start date!
      if (currentSettings.lastPeriodStart === dateStr) {
        if (currentSettings.previousPeriodStart && currentSettings.previousPeriodStart !== dateStr) {
          updatedSettings.lastPeriodStart = currentSettings.previousPeriodStart;
        } else {
          // Revert to default cycle anchor (e.g. 12 days ago)
          updatedSettings.lastPeriodStart = getDefaultLastPeriodStart();
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
}));
