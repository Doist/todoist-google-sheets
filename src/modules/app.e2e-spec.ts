import { ExtensionVerificationGuard, registerViews } from '@doist/ui-extensions-server'

import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import request from 'supertest'
import { DataSource } from 'typeorm'

import { mockConnection } from '../../test/mocks'
import { User } from '../entities/user.entity'
import { UserDatabaseService } from '../services/user-database.service'

import { AppModule } from './app.module'

import type { DoistCardResponse } from '@doist/ui-extensions-core'
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
                expect(JSON.stringify(body)).toMatch(
                    /This extension is only available for projects./,
                )
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
