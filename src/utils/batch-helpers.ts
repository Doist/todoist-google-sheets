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

/**
 * Runs an async function, waiting for a free slot first when a concurrency limit applies.
 */
export type ConcurrencyLimiter = <T>(fn: () => Promise<T>) => Promise<T>

/**
 * Creates a limiter that runs at most `concurrencyLimit` async functions at once. Functions
 * beyond the limit wait in call order until a running one settles.
 *
 * @param concurrencyLimit - Maximum number of functions running at once
 * @returns Limiter that wraps each async function
 */
export function createConcurrencyLimiter(concurrencyLimit: number): ConcurrencyLimiter {
    let active = 0
    const queue: (() => void)[] = []

    return async <T>(fn: () => Promise<T>): Promise<T> => {
        if (active < concurrencyLimit) {
            active++
        } else {
            await new Promise<void>((resolve) => queue.push(resolve))
        }

        try {
            return await fn()
        } finally {
            const next = queue.shift()
            if (next) {
                next()
            } else {
                active--
            }
        }
    }
}
