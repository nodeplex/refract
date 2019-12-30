import gen from "./gen";
import { Mutable } from "./defs";
import { NotifyEvent, JournalEntry } from "./ReflectionEvent";

export const markers = new Set<number[]>();
export const journal = [] as JournalEntry[];
export const keys = [] as PropertyKey[];
export const topics = [] as unknown[];

export function marshal() {
    for (const marker of markers) {
        marker.push(journal.length);
    }

    const event = Object.create(NotifyEvent.prototype) as Mutable<NotifyEvent>;
    event.gen = gen.next();
    event.journal = journal.slice(0);
    event.keys = new Set(keys);
    event.topics = new Set(topics);
    markers.clear();
    journal.length = 0;
    keys.length = 0;
    topics.length = 0;

    return event as NotifyEvent;
}
