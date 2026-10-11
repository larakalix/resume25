export async function copyEmail(email: string, writeText?: (text: string) => Promise<void>): Promise<string> {
    try {
        if (!writeText) throw new Error('Clipboard unavailable');
        await writeText(email);
        return 'Email copied. Ready to paste.';
    } catch {
        return 'Could not copy automatically. Use the email link or select the address to copy it.';
    }
}
