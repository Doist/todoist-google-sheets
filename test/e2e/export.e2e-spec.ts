import { TodoistApi } from '@doist/todoist-api-typescript'

import request from 'supertest'

import { CardActions as SheetCardActions } from '../../src/constants/card-actions'
import { GoogleSheetsService } from '../../src/services/google-sheets.service'
import { buildUser } from '../fixtures'
import { setupGetToken, setupGetUser } from '../setups'

import { createTestApp } from './helpers'

import type { DoistCardResponse } from '@doist/ui-extensions-core'
import type { INestApplication } from '@nestjs/common'

describe('export e2e tests', () => {
    let app: INestApplication

    afterAll(() => app.close())

    beforeAll(async () => {
        const { appModule } = await createTestApp()
        app = appModule
    })

    it('returns the no tasks card if no tasks for the specified project', () => {
        setupGetUser(buildUser())
        setupGetToken('token')

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
                    inputs: {
                        'Input.completed': 'true',
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

    it('returns the error card if inputs are not present (should not happen, but you never know)', () => {
        setupGetUser(buildUser())
        setupGetToken('token')

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
            .expect(400)
            .expect('Content-Type', /json/)
            .then((response) => {
                const body = response.body as DoistCardResponse
                expect(body.card).toBeDefined()

                const json = JSON.stringify(body)
                expect(json).toMatch(/Unfortunately, it looks like something went wrong./)
                expect(json).not.toMatch(/Retry/)
            })
    })

    it('returns the error card if talking to Todoist fails', () => {
        setupGetUser(buildUser())
        setupGetToken('token')

        jest.spyOn(TodoistApi.prototype, 'getTasks').mockImplementation(() => {
            throw new Error('Error talking to Todoist')
        })

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
                    inputs: {
                        'Input.completed': 'true',
                    },
                },
            })
            .expect(500)
            .expect('Content-Type', /json/)
            .then((response) => {
                const body = response.body as DoistCardResponse
                expect(body.card).toBeDefined()

                const json = JSON.stringify(body)
                expect(json).toMatch(/Unfortunately, it looks like something went wrong./)
                expect(json).toMatch(/Retry/)
            })
    })

    it('returns the error card if talking to Google fails', () => {
        setupGetUser(buildUser())
        setupGetToken('token')

        jest.spyOn(GoogleSheetsService.prototype, 'exportToSheets').mockImplementation(() => {
            throw new Error('Generic error talking to Google')
        })

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
                    inputs: {
                        'Input.completed': 'true',
                    },
                },
            })
            .expect(500)
            .expect('Content-Type', /json/)
            .then((response) => {
                const body = response.body as DoistCardResponse
                expect(body.card).toBeDefined()

                const json = JSON.stringify(body)
                expect(json).toMatch(/Unfortunately, it looks like something went wrong./)
                expect(json).toMatch(/Retry/)
            })
    })
})
