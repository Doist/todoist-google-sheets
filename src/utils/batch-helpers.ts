/**
 * Executes promises in batches with a maximum concurrency limit.
 * This prevents overwhelming the API with too many parallel requests.
 *
 * @param items - Array of items to process
 * @param fn - Async function to execute for each item
 * @param concurrencyLimit - Maximum number of concurrent requests (default: 10)
 * @returns Promise that resolves with all results
 */
export async function batchExecute<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrencyLimit = 10,
): Promise<R[]> {
    const results: R[] = []
    const executing: Promise<void>[] = []

    for (const item of items) {
        const promise = fn(item).then((result) => {
            results.push(result)
            executing.splice(executing.indexOf(promise), 1)
        })

        executing.push(promise)

        if (executing.length >= concurrencyLimit) {
            await Promise.race(executing)
        }
    }

    await Promise.all(executing)
    return results
}
