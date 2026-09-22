const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
export function resultDate(text: string, context: { seasonYear?: number|null; referenceDate?: string|null } = {}): string|null {
 const iso=/\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(text);
 const us=/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/.exec(text);
 const named=/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?\b/i.exec(text);
 if(!iso&&!us&&!named) return null;
 const month=iso?Number(iso[2]):us?Number(us[1]):months.indexOf(named![1]!.toLowerCase())+1;
 const day=Number(iso?.[3]??us?.[2]??named?.[2]);
 const explicitYear=iso?.[1]??us?.[3]??named?.[3];
 const year=explicitYear?Number(explicitYear):context.referenceDate?Number(context.referenceDate.slice(0,4)):context.seasonYear?context.seasonYear-(month>=8?1:0):null;
 if(!year) return null;
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day) return null;
 return date.toISOString().slice(0,10);
}
