import { StateService } from '@doist/ui-extensions-server'

import { HttpModule } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { of } from 'rxjs'

import { DatabaseModule } from '../modules/database.module'

import { GoogleSheetsService, TokenInfo } from './google-sheets.service'
import { UserDatabaseService } from './user-database.service'

import type { AxiosResponse } from 'axios'
import type { User } from '../entities/user.entity'

describe('GoogleSheetsService', () => {
    let target: GoogleSheetsService

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [HttpModule, DatabaseModule],
            providers: [GoogleSheetsService, UserDatabaseService, StateService],
        }).compile()

        target = await moduleRef.resolve(GoogleSheetsService)
    })

    describe('getAuthorizationUrl', () => {
        it('returns the correct url', () => {
            jest.spyOn(target['stateService'], 'createState').mockReturnValue('state')

            expect(target.getAuthorizationUrl(1)).toEqual(
                'https://accounts.google.com/o/oauth2/v2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fspreadsheets&state=state&access_type=offline&prompt=consent&response_type=code&client_id=lskdfjsldkfjs&redirect_uri=https%3A%2F%2Ftwist-test.todoist.net%2Fauth',
            )
        })
    })

    describe('isAuthenticated', () => {
        it('returns true if the user is authenticated', async () => {
            jest.spyOn(target['dbService'], 'getUser').mockResolvedValue({
                authToken: 'token',
            } as User)

            expect(await target.isAuthenticated(1)).toBe(true)
        })

        it('returns false if the user is not authenticated', async () => {
            jest.spyOn(target['dbService'], 'getUser').mockResolvedValue(undefined)

            expect(await target.isAuthenticated(1)).toBe(false)
        })
    })

    describe('hasValidToken', () => {
        it('returns true if the token is valid', async () => {
            jest.spyOn(target['httpService'], 'get').mockReturnValue(
                of({
                    data: {
                        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/spreadsheets',
                    },
                } as AxiosResponse<TokenInfo>),
            )

            expect(await target.hasValidToken('token')).toBe(true)
        })

        it('returns false if the token is not valid', async () => {
            jest.spyOn(target['httpService'], 'get').mockReturnValue(
                of({
                    data: {
                        scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
                    },
                } as AxiosResponse<TokenInfo>),
            )

            expect(await target.hasValidToken('token')).toBe(false)
        })
    })
})
