import {
    AccessTokenData,
    AuthenticatedUser,
    AuthenticationClient,
    StateService,
    UserDatabaseService,
} from '@doist/ui-extensions-server'

import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import dayjs from 'dayjs'
import { Auth, oauth2_v2 } from 'googleapis'
import { lastValueFrom } from 'rxjs'

import { getConfiguration } from '../config/configuration'

import type { User } from '../entities/user.entity'

const scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/spreadsheets',
]

type TokenInfo = {
    scope: string
}
const TOKEN_INFO = 'https://www.googleapis.com/oauth2/v1/tokeninfo'

@Injectable()
export class GoogleSheetsService extends AuthenticationClient {
    constructor(
        private readonly dbService: UserDatabaseService<User>,
        stateService: StateService,
        private readonly httpService: HttpService,
    ) {
        super(getConfiguration().googleClientId, stateService, dbService)
        this.apiKey = getConfiguration().googleApiKey
    }

    private apiKey: string

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
