import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Todo, Reminder } from '@/lib/types';

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

function fold(line: string) {
  // RFC 5545: lines longer than 75 octets should be folded with a leading space
  const out: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    out.push(rest.slice(0, 75));
    rest = ' ' + rest.slice(75);
  }
  out.push(rest);
  return out.join('\r\n');
}

function dtStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function dateOnly(due: string) {
  return due.replace(/-/g, '');
}

function nextDay(due: string) {
  const d = new Date(due + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function floatingDateTime(date: string, time: string) {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return new NextResponse('Not found', { status: 404 });

  const supabase = createAdminClient();

  const { data: tokenRow } = await supabase.from('calendar_tokens').select('user_id').eq('token', token).maybeSingle();
  if (!tokenRow) return new NextResponse('Not found', { status: 404 });
  const userId = tokenRow.user_id;

  const { data: rows } = await supabase
    .from('myspace_data_v2')
    .select('key,value')
    .eq('user_id', userId)
    .in('key', ['todos', 'reminders']);

  const todos = ((rows?.find((r) => r.key === 'todos')?.value as Todo[]) || []).filter((t) => !t.done && t.due);
  const reminders = ((rows?.find((r) => r.key === 'reminders')?.value as Reminder[]) || []).filter((r) => !r.done && r.datetime);

  const events: string[] = [];

  todos.forEach((t) => {
    const summary = icsEscape(t.text);
    const desc = icsEscape(t.notes || '');
    if (t.time) {
      const start = floatingDateTime(t.due, t.time);
      const endTime = t.endTime || t.time;
      const end = floatingDateTime(t.due, endTime === t.time ? t.time : endTime);
      events.push(
        [
          'BEGIN:VEVENT',
          `UID:task-${t.id}@myspace`,
          `DTSTAMP:${dtStamp()}`,
          `DTSTART:${start}`,
          `DTEND:${end === start ? start : end}`,
          fold(`SUMMARY:${summary}`),
          desc && fold(`DESCRIPTION:${desc}`),
          `CATEGORIES:${t.tab.toUpperCase()}`,
          'END:VEVENT',
        ]
          .filter(Boolean)
          .join('\r\n'),
      );
    } else {
      events.push(
        [
          'BEGIN:VEVENT',
          `UID:task-${t.id}@myspace`,
          `DTSTAMP:${dtStamp()}`,
          `DTSTART;VALUE=DATE:${dateOnly(t.due)}`,
          `DTEND;VALUE=DATE:${nextDay(t.due)}`,
          fold(`SUMMARY:${summary}`),
          desc && fold(`DESCRIPTION:${desc}`),
          `CATEGORIES:${t.tab.toUpperCase()}`,
          'END:VEVENT',
        ]
          .filter(Boolean)
          .join('\r\n'),
      );
    }
  });

  reminders.forEach((r) => {
    const [date, time] = r.datetime.split('T');
    const start = floatingDateTime(date, (time || '09:00').slice(0, 5));
    events.push(
      [
        'BEGIN:VEVENT',
        `UID:reminder-${r.id}@myspace`,
        `DTSTAMP:${dtStamp()}`,
        `DTSTART:${start}`,
        `DTEND:${start}`,
        fold(`SUMMARY:${icsEscape('🔔 ' + r.title)}`),
        r.notes && fold(`DESCRIPTION:${icsEscape(r.notes)}`),
        `CATEGORIES:REMINDER`,
        'END:VEVENT',
      ]
        .filter(Boolean)
        .join('\r\n'),
    );
  });

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//My Space//Calendar Feed//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:My Space',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="myspace.ics"',
      'Cache-Control': 'public, max-age=1800',
    },
  });
}
