export function dateToString(date: Date): string {
    let result = `${date.getFullYear()}`;
    if ((date.getMonth() + 1) < 10) {
        result += `0`;
    }
    result += `${date.getMonth() + 1}`;
    if (date.getDate() < 10) {
        result += `0`;
    }
    result += `${date.getDate()}`;
    return result;
}