import { HttpModule } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { chunk } from 'lodash'
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

    test.each([
        [0, 1],
        [50, 1],
        [99, 1],
        [100, 2],
        [101, 2],
        [150, 2],
        [199, 2],
        [200, 3],
    ])('when task count is %i, should call %i times', async (taskCount, expectedCalls) => {
        setupGetCompletedItems(Array(taskCount).fill({}) as SyncTask[])
        const target = await getTarget()
        const httpServer = jest.spyOn(target['httpService'], 'get')

        await target.getCompletedTasks({
            projectId: '123',
            token: 'kwijibo',
        })
        expect(httpServer).toHaveBeenCalledTimes(expectedCalls)
    })

    function setupGetCompletedItems(items: SyncTask[]) {
        const allTasks = chunk(items, 100)

        server.use(
            rest.get('https://api.todoist.com/sync/v9/items/get_completed', (req, res, ctx) => {
                const offset = getOffset(req.url)
                const tasks = allTasks[offset / 100] ?? []
                return res(ctx.json(tasks))
            }),
        )
    }

    function getOffset(url: URL) {
        return parseInt(url.searchParams.get('offset') || '0', 10)
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
