'use client';

import { useMemo, useState } from 'react';
import { Segment, SegmentButton } from '@/components/ui/Segment';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/lib/store';
import { today } from '@/lib/date';
import { Briefcase, Home, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const CTX_META = {
  work: { icon: Briefcase, title: 'Work Planner', label: 'Work', badge: 'blue' as const },
  personal: { icon: Home, title: 'Personal Planner', label: 'Personal', badge: 'green' as const },
};

type Ctx = keyof typeof CTX_META;
type PlannerTab = 'year25' | 'year26' | 'week';

export default function PlannerPage() {
  const { value: yearNotes, setValue: setYearNotes } = useStore<Record<string, string>>('planner_year', {});
  const { value: weekNotes, setValue: setWeekNotes } = useStore<Record<string, string>>('planner_week', {});
  const [ctx, setCtx] = useState<Ctx>('work');
  const [tab, setTab] = useState<PlannerTab>('year26');
  const [weekOffset, setWeekOffset] = useState(0);

  const meta = CTX_META[ctx];

  const weekDays = useMemo(() => {
    const now = new Date();
    const dow = (now.getDay() + 6) % 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - dow + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  function yearKey(yr: number, i: number) {
    return `${ctx}_${yr}-${i}`;
  }
  function weekKey(ds: string) {
    return `${ctx}_week_${ds}`;
  }

  const tds = today();
  const yr = tab === 'year25' ? 2025 : 2026;
  const fmtShort = (d: Date) => `${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <meta.icon size={22} className="text-text" />
          <div>
            <div className="text-[22px] font-bold leading-tight text-text">{meta.title}</div>
          </div>
          <Badge color={meta.badge}>{meta.label}</Badge>
        </div>
        <Segment>
          <SegmentButton active={ctx === 'work'} onClick={() => setCtx('work')}>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase size={13} /> Work
            </span>
          </SegmentButton>
          <SegmentButton active={ctx === 'personal'} onClick={() => setCtx('personal')}>
            <span className="inline-flex items-center gap-1.5">
              <Home size={13} /> Personal
            </span>
          </SegmentButton>
        </Segment>
      </div>

      <Segment className="mb-5">
        <SegmentButton active={tab === 'year25'} onClick={() => setTab('year25')}>
          2025
        </SegmentButton>
        <SegmentButton active={tab === 'year26'} onClick={() => setTab('year26')}>
          2026
        </SegmentButton>
        <SegmentButton active={tab === 'week'} onClick={() => setTab('week')}>
          Week
        </SegmentButton>
      </Segment>

      {tab !== 'week' ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {MONTHS.map((m, i) => {
            const key = yearKey(yr, i);
            const val = yearNotes[key] || '';
            return (
              <div key={key} className={`rounded-xl border p-3 transition ${val ? 'border-accent/30 bg-accent-bg/40' : 'border-border bg-surface'}`}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-text">{m}</span>
                  {val && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                </div>
                <textarea
                  defaultValue={val}
                  onBlur={(e) => setYearNotes((n) => ({ ...n, [key]: e.target.value }))}
                  placeholder={`Plans for ${m} ${yr}...`}
                  className="min-h-[80px] w-full resize-none bg-transparent text-[12.5px] text-text2 outline-none placeholder:italic placeholder:text-text4"
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-center gap-3">
            <button onClick={() => setWeekOffset((o) => o - 1)} className="rounded-md p-1 text-text3 hover:bg-bg3">
              <ChevronLeft size={16} />
            </button>
            <span className="text-[13px] font-medium text-text">
              {fmtShort(weekDays[0])} — {fmtShort(weekDays[6])}, {weekDays[0].getFullYear()}
            </span>
            <button onClick={() => setWeekOffset((o) => o + 1)} className="rounded-md p-1 text-text3 hover:bg-bg3">
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="space-y-2">
            {weekDays.map((d, i) => {
              const ds = d.toISOString().slice(0, 10);
              const isToday = ds === tds;
              const wk = weekKey(ds);
              const val = weekNotes[wk] || '';
              return (
                <div
                  key={ds}
                  className={`flex gap-3 rounded-xl border p-3 ${isToday ? 'border-accent bg-accent-bg/30' : 'border-border bg-surface'}`}
                >
                  <div className="flex w-14 shrink-0 flex-col items-center justify-center">
                    <div className="text-[10px] font-semibold uppercase text-text3">{DAYS[i].slice(0, 3)}</div>
                    <div className={`text-lg font-bold ${isToday ? 'text-accent' : 'text-text'}`}>{d.getDate()}</div>
                  </div>
                  <textarea
                    defaultValue={val}
                    onBlur={(e) => setWeekNotes((n) => ({ ...n, [wk]: e.target.value }))}
                    placeholder={`${meta.label} plans for ${DAYS[i]}...`}
                    className="min-h-[48px] flex-1 resize-none bg-transparent text-[13px] text-text2 outline-none placeholder:italic placeholder:text-text4"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
