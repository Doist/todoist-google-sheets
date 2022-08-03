import {
    ActionsService as ActionsServiceBase,
    CardActions,
    Submit,
} from '@doist/ui-extensions-server'

import { Injectable } from '@nestjs/common'

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

    private getHomeCard(_request: DoistCardRequest): Promise<DoistCardResponse> {
        const card = this.adaptiveCardsService.homeCard()
        return Promise.resolve({ card })
    }
}
