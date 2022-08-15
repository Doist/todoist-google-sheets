import {
    AccessTokenData,
    AuthenticatedUser,
    AuthenticationClient,
    StateService,
} from '@doist/ui-extensions-server'

import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import dayjs from 'dayjs'
import { Auth, oauth2_v2, sheets_v4 } from 'googleapis'
import { lastValueFrom } from 'rxjs'

import { getConfiguration } from '../config/configuration'
import { DELIMITER } from '../types'

import { UserDatabaseService } from './user-database.service'

const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/spreadsheets',
]

type ExportData = {
    csvData: string
    title: string
    authToken: string
}

export type TokenInfo = {
    scope: string
}
const TOKEN_INFO = 'https://www.googleapis.com/oauth2/v1/tokeninfo'

@Injectable()
export class GoogleSheetsService extends AuthenticationClient {
    constructor(
        private readonly dbService: UserDatabaseService,
        stateService: StateService,
        private readonly httpService: HttpService,
    ) {
        super(getConfiguration().googleClientId, stateService, dbService)
        this.apiKey = getConfiguration().googleApiKey
    }

    private apiKey: string

    async isAuthenticated(twistId: number): Promise<boolean> {
        const user = await this.dbService.getUser(twistId)

        return Boolean(user?.authToken)
    }

    getAuthorizationUrl(userId: number): string {
        return this.oauthClient.generateAuthUrl({
            scope: scopes,
            state: this.stateService.createState(userId),
            access_type: 'offline',
            prompt: 'consent',
        })
    }

    override async exchangeToken(code: string): Promise<AccessTokenData> {
        const { tokens } = await this.oauthClient.getToken(code)
        return {
            accessToken: tokens.access_token ?? '',
            expiresAt: this.getExpirationDate(tokens),
            refreshToken: tokens.refresh_token ?? '',
        }
    }

    override async refreshToken(refreshToken: string): Promise<AccessTokenData | undefined> {
        this.oauthClient.setCredentials({
            refresh_token: refreshToken,
        })
        const headers = await this.oauthClient.getRequestHeaders()
        if (!('Authorization' in headers)) {
            return undefined
        }
        const authHeader = headers['Authorization']
        if (!authHeader?.startsWith('Bearer ')) {
            return undefined
        }

        const bearerToken = authHeader.split(' ')[1]
        if (!bearerToken) {
            return undefined
        }

        return {
            accessToken: bearerToken,
            expiresAt: undefined,
            refreshToken: undefined,
        }
    }

    async hasValidToken(token: string): Promise<boolean> {
        const url = new URL(TOKEN_INFO)
        url.searchParams.append('access_token', token)

        const response = await lastValueFrom(this.httpService.get<TokenInfo>(url.toString()))
        const { scope } = response.data

        return scopes.every((tokenScope) => scope.includes(tokenScope))
    }

    async revokeToken(token: string): Promise<void> {
        await this.oauthClient.revokeToken(token)
    }

    async getAuthenticatedUser(authToken: string): Promise<AuthenticatedUser> {
        const client = new oauth2_v2.Oauth2({ auth: authToken })
        const { data } = await client.userinfo.get({
            key: getConfiguration().googleApiKey,
            oauth_token: authToken,
        })

        if (!data.email || !data.id || !data.name) {
            throw new Error('Missing user data')
        }

        return {
            email: data.email,
            id: data.id,
            name: data.name,
        }
    }

    async exportToSheets({ authToken, csvData, title }: ExportData): Promise<string | undefined> {
        const client = new sheets_v4.Sheets({ auth: authToken })

        const { data } = await client.spreadsheets.create({
            key: this.apiKey,
            oauth_token: authToken,
            requestBody: {
                properties: {
                    title: title,
                },
            },
        })

        const { spreadsheetId, spreadsheetUrl } = data

        await client.spreadsheets.batchUpdate({
            key: this.apiKey,
            oauth_token: authToken,
            spreadsheetId: spreadsheetId as string,
            requestBody: {
                requests: [
                    {
                        pasteData: {
                            coordinate: {
                                rowIndex: 0,
                                columnIndex: 0,
                            },
                            data: csvData,
                            delimiter: DELIMITER,
                        },
                    },
                ],
            },
        })
        return spreadsheetUrl ?? undefined
    }

    private _oauthClient?: Auth.OAuth2Client

    private get oauthClient(): Auth.OAuth2Client {
        if (!this._oauthClient) {
            const { googleClientId, googleClientSecret } = getConfiguration()
            this._oauthClient = new Auth.OAuth2Client({
                clientId: googleClientId,
                clientSecret: googleClientSecret,
                redirectUri: this.createRedirectUrl(),
            })
        }

        return this._oauthClient
    }

    private getExpirationDate(tokenData: Auth.Credentials): Date {
        return dayjs(tokenData.expiry_date as number).toDate()
    }
}
