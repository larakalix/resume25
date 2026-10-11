export function splitPageDescription(description: string): string[] {
    return description.split('|').map(text => text.trim()).filter(Boolean);
}
