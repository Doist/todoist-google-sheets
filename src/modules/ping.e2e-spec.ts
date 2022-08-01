import { Test } from '@nestjs/testing'
import request from 'supertest'

import { PingModule } from './ping.module'

import type { NestExpressApplication } from '@nestjs/platform-express'

async function createTestApp(): Promise<{
    appModule: NestExpressApplication
}> {
    const moduleRef = await Test.createTestingModule({
        imports: [PingModule],
    }).compile()

    const app = moduleRef.createNestApplication<NestExpressApplication>()

    return { appModule: await app.init() }
}

describe('PingModule', () => {
    let app: NestExpressApplication

    afterEach(() => jest.restoreAllMocks())

    afterAll(() => app.close())

    beforeAll(async () => {
        const { appModule } = await createTestApp()
        app = appModule
    })

    it('/GET /ping', () => request(app.getHttpServer()).get('/ping').expect(200).expect('pong'))
})
