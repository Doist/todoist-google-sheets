import {
    ActionsService as ActionsServiceBase,
    CardActions,
    Submit,
} from '@doist/ui-extensions-server'

import { Injectable } from '@nestjs/common'

import { CardActions as SheetsCardActions } from '../constants/card-actions'

import { AdaptiveCardService } from './adaptive-card.service'
import { GoogleLoginService } from './google-login.service'
import { GoogleSheetsService } from './google-sheets.service'
import { UserDatabaseService } from './user-database.service'

import type {
    ContextMenuData,
    DoistCardRequest,
    DoistCardResponse,
} from '@doist/ui-extensions-core'

@Injectable()
export class ActionsService extends ActionsServiceBase {
    constructor(
        private readonly googleSheetsService: GoogleSheetsService,
        private readonly googleLoginService: GoogleLoginService,
        private readonly adaptiveCardsService: AdaptiveCardService,
        private readonly userDatabaseService: UserDatabaseService,
    ) {
        super()
    }

    private isFromProject(request: DoistCardRequest): boolean {
        const contextData = request.action.params as ContextMenuData | undefined

        return contextData?.source === 'project'
    }

    async getInitialView(request: DoistCardRequest): Promise<DoistCardResponse> {
        if (!this.isFromProject(request)) {
            return { card: this.adaptiveCardsService.projectOnlyCard() }
        }

        if (!(await this.googleSheetsService.isAuthenticated(request.context.user.id))) {
            return this.googleLoginService.getAuthentication(request.context, true)
        }

        return this.getHomeCard(request)
    }

    @Submit({ actionId: CardActions.LogOut })
    async logOut(request: DoistCardRequest): Promise<DoistCardResponse> {
        const { context } = request
        // From: https://afterlogic.com/mailbee-net/docs/OAuth2GoogleRegularAccountsInstalledApps.html#ClearingRevoking
        // > Also, revoking won't work for expired tokens. If it's expired and you want to test revoking, refresh it first.
        const token = await this.googleSheetsService.getCurrentOrRefreshedToken(context.user.id)
        if (token) {
            this.googleSheetsService.revokeToken(token.token).catch(() => {
                // noop
            })
        }
        await this.userDatabaseService.removeToken(context.user.id)
        return this.googleLoginService.getAuthentication(request.context)
    }

    @Submit({ actionId: CardActions.Settings })
    async getSettingsCard(request: DoistCardRequest): Promise<DoistCardResponse> {
        const { context } = request
        const user = await this.userDatabaseService.getUser(context.user.id)
        if (!user) {
            return this.googleLoginService.getAuthentication(context)
        }
        const card = this.adaptiveCardsService.settingsCard({ user })
        return { card }
    }

    @Submit({ actionId: SheetsCardActions.Export })
    export(_request: DoistCardRequest): Promise<DoistCardResponse> {
        return Promise.resolve({})
    }

    private getHomeCard(request: DoistCardRequest): Promise<DoistCardResponse> {
        const contextData = request.action.params as ContextMenuData
        const card = this.adaptiveCardsService.homeCard({
            projectName: contextData.content,
        })
        return Promise.resolve({ card })
    }
}
