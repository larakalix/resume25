export type HatId = 'everyday' | 'thanksgiving' | 'christmas' | 'halloween' | 'birthday'
export type HatChoice = 'auto' | HatId
export const HAT_TIME_ZONE = 'America/New_York'
export const hatNames: Record<HatId, string> = {
    everyday: 'Everyday cap', thanksgiving: 'Turkey hat', christmas: 'Santa hat', halloween: 'Witch hat', birthday: 'Birthday hat',
}
export const hatChoices: { label: string; value: HatChoice }[] = [
    { label: 'Automatic · seasonal', value: 'auto' },
    ...Object.entries(hatNames).map(([value, label]) => ({ label, value: value as HatId })),
]
export function hatChoice(value: unknown): HatChoice {
    return typeof value === 'string' && hatChoices.some(item => item.value === value) ? value as HatChoice : 'auto'
}
const calendar = new Intl.DateTimeFormat('en-US', { timeZone: HAT_TIME_ZONE, year: 'numeric', month: 'numeric', day: 'numeric' })
/** U.S. Thanksgiving is the fourth Thursday. Use calendar days, never elapsed local hours. */
export function thanksgivingDay(year: number) { return 1 + (4 - new Date(Date.UTC(year, 10, 1)).getUTCDay() + 7) % 7 + 21 }
/** Birthday June 1; Halloween Oct 25–31; Thanksgiving Mon–Sun; Christmas Dec 20–26. */
export function seasonalHat(date: Date): HatId {
    if (!Number.isFinite(date.getTime())) return 'everyday'
    const parts = Object.fromEntries(calendar.formatToParts(date).map(part => [part.type, Number(part.value)]))
    const year = parts.year!, month = parts.month!, day = parts.day!
    if (month === 6 && day === 1) return 'birthday'
    if (month === 10 && day >= 25) return 'halloween'
    if (month === 12 && day >= 20 && day <= 26) return 'christmas'
    const today = Date.UTC(year, month - 1, day), thanksgiving = Date.UTC(year, 10, thanksgivingDay(year))
    if (today >= thanksgiving - 3 * 86_400_000 && today <= thanksgiving + 3 * 86_400_000) return 'thanksgiving'
    return 'everyday'
}
