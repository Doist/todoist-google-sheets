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

        it('should scan the whole project history using 90-day windows', async () => {
            const requests = setupGetCompletedItems([])
            const target = await getTarget()

            const result = await target.getCompletedTasks({ projectId: '123', token: 'kwijibo' })

            const windows = requests
                .map((params) => ({
                    since: params.get('since') ?? '',
                    until: params.get('until') ?? '',
                    projectId: params.get('project_id'),
                }))
                .sort((a, b) => b.since.localeCompare(a.since))

            expect(result).toEqual([])
            expect(windows).toHaveLength(85)
            expect(requests.maxConcurrency()).toBeLessThanOrEqual(20)
            expect(requests.maxConcurrency()).toBeGreaterThan(1)
            expect(windows[0]?.until).toBe(now)
            expect(windows[84]?.since).toBe('2006-01-01T00:00:00.000Z')
            for (const [index, window] of windows.entries()) {
                const diffDays =
                    (new Date(window.until).getTime() - new Date(window.since).getTime()) /
                    (1000 * 60 * 60 * 24)
                expect(diffDays).toBeGreaterThan(0)
                expect(diffDays).toBeLessThanOrEqual(90)
                expect(window.projectId).toBe('123')
                if (index > 0) {
                    expect(window.until).toBe(windows[index - 1]?.since)
                }
            }
        })

        it('should return tasks completed across inactivity gaps, newest first', async () => {
            const tasks = [
                buildSyncTask({ overrides: { completed_at: '2026-10-20T08:00:00.000Z' } }),
                buildSyncTask({
                    overrides: { parent_id: 'parent', completed_at: '2020-09-25T12:00:00.000Z' },
                }),
                buildSyncTask({
                    overrides: { section_id: 'section', completed_at: '2015-01-01T00:00:00.000Z' },
                }),
            ]
            setupGetCompletedItems(tasks)
            const target = await getTarget()

            const result = await target.getCompletedTasks({ projectId: '123', token: 'kwijibo' })

            expect(result.map((task) => task.id)).toEqual(tasks.map((task) => task.id))
        })

        it('should exhaust cursor pagination in an old window', async () => {
            const tasks = Array.from({ length: 101 }, () => buildSyncTask())
            const requests = setupGetCompletedItems(tasks)
            const target = await getTarget()

            const result = await target.getCompletedTasks({ projectId: '123', token: 'kwijibo' })

            expect(result.map((task) => task.id)).toEqual(tasks.map((task) => task.id))
            expect(requests).toHaveLength(86)
            expect(requests.map((params) => params.get('cursor')).filter(Boolean)).toEqual(['1'])
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

    async function getTarget() {
        const module = await Test.createTestingModule({
            imports: [HttpModule],
            providers: [TodoistService],
        }).compile()
        const target = module.get(TodoistService)
        return target
    }
})
