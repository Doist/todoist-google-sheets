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

    describe('getCompletedTasks', () => {
        it('should call for completed tasks', async () => {
            setupGetCompletedItems([])
            const target = await getTarget()
            const httpServer = jest.spyOn(target['httpService'], 'get')

            const result = await target.getCompletedTasks({
                projectId: '123',
                token: 'kwijibo',
            })
            expect(result).toEqual([])
            expect(httpServer).toHaveBeenCalled()
        })

        it('should fetch completed tasks across date windows', async () => {
            setupGetCompletedItems([{} as SyncTask, {} as SyncTask])
            const target = await getTarget()

            const result = await target.getCompletedTasks({
                projectId: '123',
                token: 'kwijibo',
            })
            expect(result.length).toBeGreaterThanOrEqual(2)
        })

        it('should send since and until params within 90-day windows', async () => {
            const capturedParams: URLSearchParams[] = []

            server.use(
                rest.get(
                    'https://api.todoist.com/api/v1/tasks/completed/by_completion_date',
                    (req, res, ctx) => {
                        capturedParams.push(req.url.searchParams)
                        return res(ctx.json({ items: [] }))
                    },
                ),
            )

            const target = await getTarget()
            await target.getCompletedTasks({ projectId: '123', token: 'kwijibo' })

            expect(capturedParams.length).toBeGreaterThan(0)
            for (const params of capturedParams) {
                const since = new Date(params.get('since')!)
                const until = new Date(params.get('until')!)
                const diffDays = (until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24)
                expect(diffDays).toBeLessThanOrEqual(90)
            }
        })

        it('should handle pagination via next_cursor within a window', async () => {
            const page1Items = Array(100).fill({}) as SyncTask[]
            const page2Items = [{}] as SyncTask[]
            let callCount = 0

            server.use(
                rest.get(
                    'https://api.todoist.com/api/v1/tasks/completed/by_completion_date',
                    (req, res, ctx) => {
                        const cursor = req.url.searchParams.get('cursor')

                        if (!cursor) {
                            callCount++
                            if (callCount === 1) {
                                return res(
                                    ctx.json({
                                        items: page1Items,
                                        next_cursor: 'page2',
                                    }),
                                )
                            }
                            return res(ctx.json({ items: [] }))
                        }

                        if (cursor === 'page2') {
                            return res(ctx.json({ items: page2Items }))
                        }

                        return res(ctx.json({ items: [] }))
                    },
                ),
            )

            const target = await getTarget()
            const result = await target.getCompletedTasks({
                projectId: '123',
                token: 'kwijibo',
            })

            expect(result.length).toBeGreaterThanOrEqual(101)
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

        it('should return an empty array when the sync endpoint fails', async () => {
            server.use(
                rest.post('https://api.todoist.com/api/v1/sync', (_req, res, ctx) => {
                    return res(ctx.status(500))
                }),
            )

            const target = await getTarget()
            const result = await target.getCompletedInfo({ token: 'kwijibo' })
            expect(result).toEqual([])
        })
    })

    function setupGetCompletedItems(items: SyncTask[]) {
        const allTasks = chunk(items, 100)
        const totalPages = allTasks.length

        server.use(
            rest.get(
                'https://api.todoist.com/api/v1/tasks/completed/by_completion_date',
                (req, res, ctx) => {
                    const cursor = req.url.searchParams.get('cursor')
                    const pageIndex = cursor ? parseInt(cursor, 10) : 0
                    const tasks = allTasks[pageIndex] ?? []
                    const hasMore = pageIndex < totalPages - 1
                    const nextCursor = hasMore ? (pageIndex + 1).toString() : null

                    return res(
                        ctx.json({
                            items: tasks,
                            ...(nextCursor ? { next_cursor: nextCursor } : {}),
                        }),
                    )
                },
            ),
        )
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
