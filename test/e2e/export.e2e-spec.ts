import { TodoistApi } from '@doist/todoist-api-typescript'

import request from 'supertest'

import { CardActions as SheetCardActions } from '../../src/constants/card-actions'
import { GoogleSheetsService } from '../../src/services/google-sheets.service'
import { UserDatabaseService } from '../../src/services/user-database.service'
import { buildUser } from '../fixtures'

import { createTestApp } from './helpers'

import type { DoistCardResponse } from '@doist/ui-extensions-core'
import type { INestApplication } from '@nestjs/common'

describe('export e2e tests', () => {
    let app: INestApplication

    afterEach(() => jest.restoreAllMocks())

    afterAll(() => app.close())

    beforeAll(async () => {
        const { appModule } = await createTestApp()
        app = appModule
    })

    it('returns the no tasks card if no tasks for the specified project', () => {
        jest.spyOn(UserDatabaseService.prototype, 'getUser').mockImplementation(() =>
            Promise.resolve(buildUser()),
        )
        jest.spyOn(GoogleSheetsService.prototype, 'getCurrentOrRefreshedToken').mockImplementation(
            () => Promise.resolve({ token: 'token', userId: '42' }),
        )
        jest.spyOn(TodoistApi.prototype, 'getTasks').mockImplementation(() => Promise.resolve([]))

        return request(app.getHttpServer())
            .post('/process')
            .send({
                context: { user: { id: 42 }, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: SheetCardActions.Export,
                    params: {
                        source: 'project',
                        sourceId: 1234,
                        url: 'https://google.com',
                        content: 'My Project',
                        contentPlain: 'My Project',
                    },
                },
            })
            .expect(200)
            .expect('Content-Type', /json/)
            .then((response) => {
                const body = response.body as DoistCardResponse
                expect(body.card).toBeDefined()
                expect(JSON.stringify(body)).toMatch(/\*\*My Project\*\* has no tasks to export/)
            })
    })
})
