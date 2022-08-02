import { ExtensionVerificationGuard } from '@doist/ui-extensions-server'

import { Test } from '@nestjs/testing'
import request from 'supertest'
import { DataSource } from 'typeorm'

import { mockConnection } from '../../test/mocks'

import { AppModule } from './app.module'

import type { NestExpressApplication } from '@nestjs/platform-express'

async function createTestApp(): Promise<{
    appModule: NestExpressApplication
}> {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(DataSource)
        .useValue(mockConnection())
        .overrideGuard(ExtensionVerificationGuard)
        .useValue({ canActivate: () => true })
        .compile()

    const app = moduleRef.createNestApplication<NestExpressApplication>()

    return { appModule: await app.init() }
}

describe('AppModule', () => {
    let app: NestExpressApplication

    afterEach(() => jest.restoreAllMocks())

    afterAll(() => app.close())

    beforeAll(async () => {
        const { appModule } = await createTestApp()
        app = appModule
    })

    it('/GET /ping', () => request(app.getHttpServer()).get('/ping').expect(200).expect('pong'))

    it('runs the server without crashing', () => expect(app.getHttpServer()).toBeDefined())
})
