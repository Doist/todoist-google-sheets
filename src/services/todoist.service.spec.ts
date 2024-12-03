import { HttpModule } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { rest } from 'msw'

import { server } from '../../test/server'

import { SyncTask, TodoistService } from './todoist.service'

describe('TodoistService', () => {
    beforeAll(() => {
        server.listen({ onUnhandledRequest: 'bypass' })
    })

    afterEach(() => {
        server.resetHandlers()
        jest.resetAllMocks()
    })

    afterAll(() => server.close())

    it('should be defined', async () => {
        const target = await getTarget()
        expect(target).toBeDefined()
    })

    it('should call for completed tasks', async () => {
        setupGetCompletedItems([])
        const target = await getTarget()
        const httpServer = jest.spyOn(target['httpService'], 'get')

        const result = await target.getCompletedTasks({
            projectId: '123',
            token: 'kwijibo',
        })
        expect(result).toEqual([])
        expect(httpServer).toHaveBeenCalledTimes(1)
    })

    type TestCase = [number, number, string | undefined]
    test.each<TestCase>([
        [0, 1, ''],
        [50, 1, ''],
        [99, 1, ''],
        [100, 1, ''],
        [101, 1, ''],
        [150, 1, ''],
        [199, 1, ''],
        [200, 2, 'cursor'],
    ])('when task count is %i, should call %i times', async (taskCount, expectedCalls, cursor) => {
        setupGetCompletedItems(Array(taskCount).fill({}) as SyncTask[], cursor)
        const target = await getTarget()
        const httpServer = jest.spyOn(target['httpService'], 'get')

        await target.getCompletedTasks({
            projectId: '123',
            token: 'kwijibo',
        })
        expect(httpServer).toHaveBeenCalledTimes(expectedCalls)
    })

    function setupGetCompletedItems(items: SyncTask[], cursor?: string) {
        server.use(
            rest.get('https://api.todoist.com/sync/v9/tasks/archived', (req, res, ctx) => {
                const requestedCursor = getCursor(req.url)
                return res(
                    ctx.json({
                        ...(cursor && !requestedCursor ? { next_cursor: cursor } : {}),
                        items,
                    }),
                )
            }),
        )
    }

    function getCursor(url: URL) {
        return url.searchParams.get('cursor')
    }

    async function getTarget() {
        const module = await Test.createTestingModule({
            imports: [HttpModule],
            providers: [TodoistService],
        }).compile()
        const target = module.get(TodoistService)
        return target
    }
})
