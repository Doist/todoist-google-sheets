import { CardActions } from '@doist/ui-extensions-server'

import request from 'supertest'

import { UserDatabaseService } from '../../src/services/user-database.service'

import { createTestApp } from './helpers'

import type { DoistCardResponse } from '@doist/ui-extensions-core'
import type { INestApplication } from '@nestjs/common'
import type { User } from '../../src/entities/user.entity'

describe('Settings e2e tests', () => {
    let app: INestApplication

    afterEach(() => jest.restoreAllMocks())

    afterAll(() => app.close())

    beforeAll(async () => {
        const { appModule } = await createTestApp()
        app = appModule
    })

    it('returns the settings card with the correct name/email', () => {
        jest.spyOn(UserDatabaseService.prototype, 'getUser').mockImplementationOnce(() =>
            Promise.resolve({
                name: 'Ian Malcolm',
                emailAddress: 'ian@ingen.com',
            } as User),
        )
        return request(app.getHttpServer())
            .post('/settings')
            .send({
                context: { user: { id: 42 }, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: CardActions.Settings,
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
                    /You’re connected to Google as \*\*Ian Malcolm\*\* \(ian@ingen.com\)./,
                )
            })
    })
})
