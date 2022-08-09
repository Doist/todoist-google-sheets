import { formatString } from '@doist/integrations-common'
import { TodoistApi } from '@doist/todoist-api-typescript'
import {
    ActionsService as ActionsServiceBase,
    CardActions,
    Submit,
    TranslationService,
} from '@doist/ui-extensions-server'

import { Injectable } from '@nestjs/common'

import { getConfiguration } from '../config/configuration'
import { CardActions as SheetsCardActions } from '../constants/card-actions'
import { Sheets } from '../i18n/en'
import { convertTasksToCsvString } from '../utils/csv-helpers'
import { getExportOptions } from '../utils/input-helpers'

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
        private readonly translationService: TranslationService,
    ) {
        super()
    }

    async getInitialView(request: DoistCardRequest): Promise<DoistCardResponse> {
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
    async export(request: DoistCardRequest): Promise<DoistCardResponse> {
        const contextData = request.action.params as ContextMenuData
        const todoistClient = new TodoistApi(getConfiguration().todoistAuthToken)

        const exportOptions = getExportOptions(request.action.inputs)

        const tasks = await todoistClient.getTasks({ projectId: contextData.sourceId })

        if (tasks.length === 0) {
            return {
                card: this.adaptiveCardsService.noTasksCard({
                    projectName: contextData.content,
                }),
            }
        }

        // Only fetch sections if we're using them, otherwise it's a wasted call
        const sections = exportOptions['section']
            ? await todoistClient.getSections(contextData.sourceId)
            : []

        const csvData = convertTasksToCsvString({
            tasks,
            sections,
            exportOptions,
        })

        await this.googleSheetsService.exportToSheets({
            title: this.createSheetName(contextData.content),
            data: csvData,
        })

        // TODO: SJL: Show success card
        return this.getHomeCard(request)
    }

    private createSheetName(projectName: string): string {
        return formatString(
            this.translationService.getTranslation(Sheets.SHEET_TITLE),
            projectName,
            new Date().toLocaleDateString(),
        )
    }

    private getHomeCard(request: DoistCardRequest): Promise<DoistCardResponse> {
        const contextData = request.action.params as ContextMenuData
        const card = this.adaptiveCardsService.homeCard({
            projectName: contextData.content,
        })
        return Promise.resolve({ card })
    }
}
