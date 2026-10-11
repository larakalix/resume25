const postDateFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
});

export function formatPostDate(date: string): string {
    return postDateFormatter.format(new Date(date));
}
