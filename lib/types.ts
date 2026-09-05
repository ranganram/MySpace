export type ID = string;

export interface Subtask {
  id: ID;
  text: string;
  done: boolean;
}

export type Priority = 'high' | 'medium' | 'low';

export interface Todo {
  id: ID;
  tab: 'office' | 'personal' | 'google';
  text: string;
  notes: string;
  pri: Priority;
  due: string;
  time: string;
  durMin: number;
  endTime: string;
  subtasks: Subtask[];
  done: boolean;
  today: boolean;
  completedAt: string;
  created: string;
  googleTaskId?: string;
  /** Which Google Tasks list this is synced with: 'office' | 'personal' (My Space owns these,
   *  pushed one-way) or '@default' (Google owns these — e.g. added via Assistant/Gemini —
   *  pulled one-way down into My Space). */
  googleListId?: string;
}

export const DAYS_SHORT = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayShort = (typeof DAYS_SHORT)[number];

export interface RecurringTask {
  id: ID;
  name: string;
  cat: 'office' | 'personal';
  pri: Priority;
  schedule: Partial<Record<DayShort, string>>;
  endSchedule: Partial<Record<DayShort, string>>;
  active: boolean;
  created: string;
}

export interface Habit {
  id: ID;
  name: string;
  category: string;
  target: number;
  targetPct: number;
  checks: Record<string, boolean>;
  created: string;
}

export interface JournalEntry {
  id: ID;
  date: string;
  title: string;
  start: string;
  dur: number;
  cat: string;
  notes: string;
}

export interface Reminder {
  id: ID;
  title: string;
  notes: string;
  datetime: string;
  pri: 'high' | 'medium' | 'low';
  cat: string;
  done: boolean;
  created: string;
}

export interface Note {
  id: ID;
  tab: 'patent' | 'topics' | 'books';
  title: string;
  body: string;
  link: string;
  created: string;
  readTarget?: boolean;
  readDone?: boolean;
}

export interface WatchUpdate {
  id: ID;
  text: string;
  date: string;
}

export type WatchStatus = 'pending' | 'on-track' | 'at-risk' | 'blocked' | 'done';

export interface WatchItem {
  id: ID;
  title: string;
  owner: string;
  due: string;
  pri: 'high' | 'medium' | 'low';
  notes: string;
  status: WatchStatus;
  updates: WatchUpdate[];
  created: string;
}

export interface Tracker {
  id: ID;
  name: string;
  unit: string;
  icon: string;
}

export interface LogEntry {
  id: ID;
  date: string;
  values: Record<string, string>;
  note: string;
  updated: string;
}

export interface MiscEntry {
  id: ID;
  title: string;
  body: string;
  created: string;
}

export interface CalItem {
  id: ID;
  title: string;
  date: string;
  start: string;
  dur: number;
  color?: string;
}
