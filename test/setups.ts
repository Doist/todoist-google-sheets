import { TodoistApi } from '@doist/todoist-api-typescript'
import { AppTokenService } from '@doist/ui-extensions-server'

import { GoogleSheetsService } from '../src/services/google-sheets.service'
import { UserDatabaseService } from '../src/services/user-database.service'

import { buildTask } from './fixtures'

import type { User } from '../src/entities/user.entity'

export function setupGetUser(user: User | undefined) {
    const getUser = jest.spyOn(UserDatabaseService.prototype, 'getUser')
    getUser.mockImplementation(() => Promise.resolve(user))
}

export function setupGetGoogleToken(token: string | undefined) {
    jest.spyOn(GoogleSheetsService.prototype, 'getCurrentOrRefreshedToken').mockImplementation(() =>
        Promise.resolve(token ? { token, userId: '42' } : undefined),
    )
}

export function setupGetAppToken(token: string | undefined) {
    jest.spyOn(AppTokenService.prototype, 'appToken', 'get').mockImplementation(() => token)
}

export function setupGetTasks() {
    jest.spyOn(TodoistApi.prototype, 'getTasks').mockImplementation(() =>
        Promise.resolve([buildTask()]),
    )
}
