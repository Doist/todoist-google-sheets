import { HttpModule } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import MockDate from 'mockdate'
import { rest } from 'msw'

import { buildSyncTask } from '../../test/fixtures'
import { server } from '../../test/server'
import { setupGetCompletedItems } from '../../test/setups'

import { TodoistService } from './todoist.service'

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

    describe('getCompletedTasks', () => {
        const now = '2026-10-20T09:00:00.000Z'

        beforeEach(() => MockDate.set(now))
        afterEach(() => MockDate.reset())

        it('should scan empty history to the lower bound using 90-day windows', async () => {
            const requests = setupGetCompletedItems([])
            const target = await getTarget()

            const result = await target.getCompletedTasks({ projectId: '123', token: 'kwijibo' })

            expect(result).toEqual([])
            expect(requests).toHaveLength(85)
            expect(requests[0]?.get('until')).toBe(now)
            expect(requests[84]?.get('since')).toBe('2006-01-01T00:00:00.000Z')
            for (const params of requests) {
                const since = new Date(params.get('since') ?? '')
                const until = new Date(params.get('until') ?? '')
                const diffDays = (until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24)
                expect(diffDays).toBeGreaterThan(0)
                expect(diffDays).toBeLessThanOrEqual(90)
            }
        })

        it.each([
            {
                scope: { projectId: '123' },
                filter: 'project_id',
                expectedCount: 1,
                requestCount: 25,
            },
            {
                scope: { taskId: '123' },
                filter: 'parent_id',
                expectedCount: undefined,
                requestCount: 85,
            },
            {
                scope: { sectionId: '123' },
                filter: 'section_id',
                expectedCount: 99,
                requestCount: 85,
            },
        ])(
            'should retrieve old $filter tasks across empty windows with count $expectedCount',
            async ({ scope, filter, expectedCount, requestCount }) => {
                const task = buildSyncTask({ overrides: { [filter]: '123' } })
                const requests = setupGetCompletedItems([task])
                const target = await getTarget()

                const result = await target.getCompletedTasks({
                    token: 'kwijibo',
                    ...scope,
                    expectedCount,
                })

                expect(result).toEqual([
                    expect.objectContaining({ id: task.id, completedAt: task.completed_at }),
                ])
                expect(requests).toHaveLength(requestCount)
                expect(requests[requestCount - 1]?.get(filter)).toBe('123')
            },
        )

        it('should stop early when the exact recent count is found', async () => {
            const tasks = Array.from({ length: 3 }, () =>
                buildSyncTask({ overrides: { completed_at: '2026-10-20T08:00:00.000Z' } }),
            )
            const requests = setupGetCompletedItems(tasks)
            const target = await getTarget()

            const result = await target.getCompletedTasks({
                projectId: '123',
                token: 'kwijibo',
                expectedCount: 3,
            })

            expect(result.map((task) => task.id)).toEqual(tasks.map((task) => task.id))
            expect(requests).toHaveLength(1)
        })

        it('should exhaust cursor pagination in an old window after empty windows', async () => {
            const tasks = Array.from({ length: 101 }, () => buildSyncTask())
            const requests = setupGetCompletedItems(tasks)
            const target = await getTarget()

            const result = await target.getCompletedTasks({
                projectId: '123',
                token: 'kwijibo',
                expectedCount: 101,
            })

            expect(result.map((task) => task.id)).toEqual(tasks.map((task) => task.id))
            expect(requests).toHaveLength(26)
            expect(requests[25]?.get('cursor')).toBe('1')
        })

        it('should return empty array and log error when API fails', async () => {
            server.use(
                rest.get(
                    'https://api.todoist.com/api/v1/tasks/completed/by_completion_date',
                    (_req, res, ctx) => {
                        return res(ctx.status(400))
                    },
                ),
            )

            const target = await getTarget()
            const result = await target.getCompletedTasks({
                projectId: '123',
                token: 'kwijibo',
            })
            expect(result).toEqual([])
        })
    })

    describe('getCompletedInfo', () => {
        it('should fetch completed_info from the v1 sync endpoint', async () => {
            const completedInfo = [
                { project_id: '123', completed_items: 5 },
                { item_id: 'task1', completed_items: 2 },
            ]

            let capturedBody: Record<string, string> | undefined
            let capturedAuthHeader: string | undefined

            server.use(
                rest.post('https://api.todoist.com/api/v1/sync', async (req, res, ctx) => {
                    capturedBody = await req.json()
                    capturedAuthHeader = req.headers.get('Authorization') ?? undefined
                    return res(ctx.json({ completed_info: completedInfo }))
                }),
            )

            const target = await getTarget()
            const result = await target.getCompletedInfo({ token: 'kwijibo' })
            expect(result).toEqual(completedInfo)
            expect(capturedAuthHeader).toBe('Bearer kwijibo')
            expect(capturedBody).toEqual({
                sync_token: '*',
                resource_types: '["completed_info"]',
            })
        })

        it('should return null when the sync endpoint fails', async () => {
            server.use(
                rest.post('https://api.todoist.com/api/v1/sync', (_req, res, ctx) => {
                    return res(ctx.status(500))
                }),
            )

            const target = await getTarget()
            const result = await target.getCompletedInfo({ token: 'kwijibo' })
            expect(result).toBeNull()
        })
    })

    async function getTarget() {
        const module = await Test.createTestingModule({
            imports: [HttpModule],
            providers: [TodoistService],
        }).compile()
        const target = module.get(TodoistService)
        return target
    }
})
