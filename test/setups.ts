import { TodoistApi } from '@doist/todoist-api-typescript'

import { GoogleSheetsService } from '../src/services/google-sheets.service'
import { UserDatabaseService } from '../src/services/user-database.service'

import { buildTask } from './fixtures'

import type { User } from '../src/entities/user.entity'

export function setupGetUser(user: User | undefined) {
    const getUser = jest.spyOn(UserDatabaseService.prototype, 'getUser')
    getUser.mockImplementation(() => Promise.resolve(user))
}

export function setupGetToken(token: string | undefined) {
    jest.spyOn(GoogleSheetsService.prototype, 'getCurrentOrRefreshedToken').mockImplementation(() =>
        Promise.resolve(token ? { token, userId: '42' } : undefined),
    )
}

export function setupGetTasks() {
    jest.spyOn(TodoistApi.prototype, 'getTasks').mockImplementation(() =>
        Promise.resolve([buildTask()]),
    )
}
