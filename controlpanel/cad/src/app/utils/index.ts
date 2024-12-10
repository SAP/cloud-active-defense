export function isJson(str: string) {
    try {
        const parsed = JSON.parse(str);
        return typeof parsed === 'object' && parsed !== null;
    } catch (e) {
        return false;
    }
}
export function isValidRegex(str: string | undefined) {
    if (!str) return true;
    try {
        new RegExp(str);
        return true
    } catch {
        return false
    }
}