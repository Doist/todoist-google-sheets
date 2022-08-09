import request from 'supertest'

import { createTestApp } from './helpers'

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
})
