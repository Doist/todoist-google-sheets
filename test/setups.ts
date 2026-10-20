import { TodoistApi } from '@doist/todoist-api-typescript'
import { AppTokenService } from '@doist/ui-extensions-server'

import { chunk } from 'lodash'
import { rest } from 'msw'

import { GoogleSheetsService } from '../src/services/google-sheets.service'
import { UserDatabaseService } from '../src/services/user-database.service'

import { buildTask } from './fixtures'
import { server } from './server'

import type { User } from '../src/entities/user.entity'
import type { SyncTask } from '../src/services/todoist.service'

export function setupGetUser(user: User | undefined) {
    const getUser = jest.spyOn(UserDatabaseService.prototype, 'getUser')
    getUser.mockImplementation(() => Promise.resolve(user))
}

export function setupGetGoogleToken(token: string | undefined) {
    jest.spyOn(GoogleSheetsService.prototype, 'getCurrentOrRefreshedToken').mockImplementation(() =>
        Promise.resolve(token ? { token, userId: '42' } : undefined),
    )
}

export function setupGetAppToken(token: string | never) {
    jest.spyOn(AppTokenService.prototype, 'appToken', 'get').mockImplementation(() => token)
}

export function setupGetTasks() {
    jest.spyOn(TodoistApi.prototype, 'getTasks').mockImplementation(() =>
        Promise.resolve({ results: [buildTask()], nextCursor: null }),
    )
}

export function setupGetCompletedItems(items: SyncTask[]) {
    const requests: URLSearchParams[] = []

    server.use(
        rest.get(
            'https://api.todoist.com/api/v1/tasks/completed/by_completion_date',
            (req, res, ctx) => {
                const params = req.url.searchParams
                requests.push(params)

                const since = new Date(params.get('since') ?? '').getTime()
                const until = new Date(params.get('until') ?? '').getTime()
                const windowItems = items.filter((task) => {
                    const completedAt = new Date(task.completed_at).getTime()
                    return completedAt >= since && completedAt < until
                })
                const pages = chunk(windowItems, 100)
                const cursor = params.get('cursor')
                const pageIndex = cursor ? parseInt(cursor, 10) : 0
                const nextCursor = pageIndex < pages.length - 1 ? String(pageIndex + 1) : null

                return res(ctx.json({ items: pages[pageIndex] ?? [], next_cursor: nextCursor }))
            },
        ),
    )

    return requests
}
