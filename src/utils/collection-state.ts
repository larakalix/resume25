export function getCollectionState(isLoading: boolean, isError: boolean, count: number): 'loading' | 'error' | 'empty' | 'ready' {
    if (isLoading) return 'loading';
    if (isError) return 'error';
    return count === 0 ? 'empty' : 'ready';
}
