import request from 'supertest'

import { setupGetUser } from '../setups'

import { createTestApp } from './helpers'

import type { DoistCardExtensionType, DoistCardResponse } from '@doist/ui-extensions-core'
import type { INestApplication } from '@nestjs/common'
import type { User } from '../../src/entities/user.entity'

describe('Core e2e tests', () => {
    let app: INestApplication

    afterAll(() => app.close())

    beforeAll(async () => {
        const { appModule } = await createTestApp()
        app = appModule
    })

    it('/GET /ping', () => request(app.getHttpServer()).get('/ping').expect(200).expect('pong'))

    it('runs the server without crashing', () => expect(app.getHttpServer()).toBeDefined())

    it('returns the project only card when coming from a task and signed in', () => {
        setupGetUser({
            authToken: 'kwijibo',
        } as User)
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

    test.each<DoistCardExtensionType>(['context-menu', 'settings'])(
        'returns the login card (assuming first run)',
        (extensionType: DoistCardExtensionType) => {
            setupGetUser(undefined)
            return request(app.getHttpServer())
                .post('/process')
                .send({
                    context: { user: { id: 42 }, theme: 'light' },
                    action: {
                        actionType: 'initial',
                        params:
                            extensionType === 'context-menu'
                                ? {
                                      source: 'project',
                                  }
                                : undefined,
                    },
                    extensionType,
                })
                .expect(200)
                .expect('Content-Type', /json/)
                .then((response) => {
                    const body = response.body as DoistCardResponse
                    expect(body.card).toBeDefined()
                    expect(JSON.stringify(body)).toMatch(/Log in with Google/)
                })
        },
    )

    it('returns the settings card if the user is logged in and is settings extension', () => {
        setupGetUser({
            emailAddress: 'alan@ingen.com',
            name: 'Alan Grant',
            authToken: 'kwijibo',
        } as User)

        return request(app.getHttpServer())
            .post('/process')
            .send({
                context: { user: { id: 42 }, theme: 'light' },
                action: {
                    actionType: 'initial',
                },
                extensionType: 'settings',
            })
            .expect(200)
            .expect('Content-Type', /json/)
            .then((response) => {
                const body = response.body as DoistCardResponse
                expect(body.card).toBeDefined()
                expect(JSON.stringify(body)).toMatch(
                    /You’re connected to Google as \*\*Alan Grant\*\* \(alan@ingen.com\)./,
                )
            })
    })
})
