import request from 'supertest'

import { UserDatabaseService } from '../../src/services/user-database.service'

import { createTestApp } from './helpers'

import type { DoistCardResponse } from '@doist/ui-extensions-core'
import type { INestApplication } from '@nestjs/common'

describe('Core e2e tests', () => {
    let app: INestApplication

    afterEach(() => jest.restoreAllMocks())

    afterAll(() => app.close())

    beforeAll(async () => {
        const { appModule } = await createTestApp()
        app = appModule
    })

    it('/GET /ping', () => request(app.getHttpServer()).get('/ping').expect(200).expect('pong'))

    it('runs the server without crashing', () => expect(app.getHttpServer()).toBeDefined())

    it(`/GET /success`, () => {
        return request(app.getHttpServer())
            .get('/success')
            .expect(200)
            .expect('Content-Type', /text\/html/)
            .then((response) => {
                const body = response.text
                expect(body).toMatch(/Go back to Todoist and click Continue./)
            })
    })

    it(`/GET /error`, () =>
        request(app.getHttpServer())
            .get('/error')
            .expect(200)
            .expect('Content-Type', /text\/html/))

    it('returns the project only card when coming from a task', () => {
        return request(app.getHttpServer())
            .post('/process')
            .send({
                context: { user: { id: 42 }, theme: 'light' },
                action: {
                    actionType: 'initial',
                    params: {
                        source: 'task',
                    },
                },
            })
            .expect(200)
            .expect('Content-Type', /json/)
            .then((response) => {
                const body = response.body as DoistCardResponse
                expect(body.card).toBeDefined()
                expect(JSON.stringify(body)).toMatch(/Exporting is only available for projects./)
            })
    })

    it('returns the login card when coming from a project (assuming first run)', () => {
        jest.spyOn(UserDatabaseService.prototype, 'getUser').mockImplementation(() =>
            Promise.resolve(undefined),
        )
        return request(app.getHttpServer())
            .post('/process')
            .send({
                context: { user: { id: 42 }, theme: 'light' },
                action: {
                    actionType: 'initial',
                    params: {
                        source: 'project',
                    },
                },
            })
            .expect(200)
            .expect('Content-Type', /json/)
            .then((response) => {
                const body = response.body as DoistCardResponse
                expect(body.card).toBeDefined()
                expect(JSON.stringify(body)).toMatch(/Log in with Google/)
            })
    })
})
