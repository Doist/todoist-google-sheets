import { batchExecute } from './batch-helpers'

describe('batchExecute', () => {
    it('should execute all promises and return results', async () => {
        const items = [1, 2, 3, 4, 5]
        const fn = jest.fn((item: number) => Promise.resolve(item * 2))

        const results = await batchExecute(items, fn, 2)

        expect(results).toEqual([2, 4, 6, 8, 10])
        expect(fn).toHaveBeenCalledTimes(5)
    })

    it('should respect concurrency limit', async () => {
        const items = [1, 2, 3, 4, 5]
        let currentConcurrency = 0
        let maxConcurrency = 0

        const fn = jest.fn(async (item: number) => {
            currentConcurrency++
            maxConcurrency = Math.max(maxConcurrency, currentConcurrency)

            // Simulate async work
            await new Promise((resolve) => setTimeout(resolve, 10))

            currentConcurrency--
            return item * 2
        })

        await batchExecute(items, fn, 2)

        expect(maxConcurrency).toBeLessThanOrEqual(2)
    })

    it('should handle empty array', async () => {
        const items: number[] = []
        const fn = jest.fn((item: number) => Promise.resolve(item * 2))

        const results = await batchExecute(items, fn, 2)

        expect(results).toEqual([])
        expect(fn).not.toHaveBeenCalled()
    })

    it('should handle errors in individual promises', async () => {
        const items = [1, 2, 3]
        const fn = jest.fn((item: number) => {
            if (item === 2) {
                return Promise.reject(new Error('Test error'))
            }
            return Promise.resolve(item * 2)
        })

        await expect(batchExecute(items, fn, 2)).rejects.toThrow('Test error')
    })

    it('should use default concurrency limit of 10', async () => {
        const items = Array.from({ length: 20 }, (_, i) => i)
        let currentConcurrency = 0
        let maxConcurrency = 0

        const fn = jest.fn(async (item: number) => {
            currentConcurrency++
            maxConcurrency = Math.max(maxConcurrency, currentConcurrency)

            await new Promise((resolve) => setTimeout(resolve, 10))

            currentConcurrency--
            return item * 2
        })

        await batchExecute(items, fn)

        expect(maxConcurrency).toBeLessThanOrEqual(10)
    })
})
