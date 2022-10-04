import request from 'supertest'

import { createTestApp } from './helpers'

import type { INestApplication } from '@nestjs/common'

describe('Auth e2e tests', () => {
    let app: INestApplication

    afterAll(() => app.close())

    beforeAll(async () => {
        const { appModule } = await createTestApp()
        app = appModule
    })

    it('/GET /success', () =>
        request(app.getHttpServer())
            .get('/success')
            .expect(200)
            .expect('Content-Type', /text\/html/))

    it('/GET /error', () =>
        request(app.getHttpServer())
            .get('/error')
            .expect(200)
            .expect('Content-Type', /text\/html/))
})
