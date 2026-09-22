import type { TeamScheduleEvent } from "@/features/teamSchedule/types";
import { displayOpponentOrEvent } from "@/features/teamSchedule/types";
import { resultDate } from "./resultDate";
import { scheduleResultsFormat } from "./scheduleLink";
export function suggestScheduleForPaste(text:string, events:readonly TeamScheduleEvent[]) {
 const normalized=text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 if(!normalized) return [];
 return events.flatMap(event=>{
  if(scheduleResultsFormat(event).ambiguous) return [];
  const date=resultDate(text,{referenceDate:event.startDate});
  const name=displayOpponentOrEvent(event).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const nameMatch=name.length>3&&normalized.includes(name);
  const dateMatch=Boolean(date&&date>=event.startDate&&date<=event.endDate);
  if(!nameMatch&&!dateMatch) return [];
  return [{event,score:(nameMatch?2:0)+(dateMatch?1:0),reason:[nameMatch?'Event name matches':null,dateMatch?`Results date ${date} falls within this event`:null].filter(Boolean).join(' · ')}];
 }).sort((a,b)=>b.score-a.score);
}
