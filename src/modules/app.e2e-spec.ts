import { ExtensionVerificationGuard, registerViews } from '@doist/ui-extensions-server'

import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import request from 'supertest'
import { DataSource } from 'typeorm'

import { mockConnection } from '../../test/mocks'
import { User } from '../entities/user.entity'

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
        .overrideProvider(getRepositoryToken(User))
        .useValue(jest.fn())
        .overrideGuard(ExtensionVerificationGuard)
        .useValue({ canActivate: () => true })
        .compile()

    const app = moduleRef.createNestApplication<NestExpressApplication>()

    await registerViews(app)

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

    it(`/GET /success`, () =>
        request(app.getHttpServer())
            .get('/success')
            .expect(200)
            .expect('Content-Type', /text\/html/))

    it(`/GET /error`, () =>
        request(app.getHttpServer())
            .get('/error')
            .expect(200)
            .expect('Content-Type', /text\/html/))
})
