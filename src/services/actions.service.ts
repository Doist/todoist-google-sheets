import { formatString } from '@doist/integrations-common'
import { Section, Task, TodoistApi } from '@doist/todoist-api-typescript'
import {
    ActionsService as ActionsServiceBase,
    AnalyticsService,
    AppTokenService,
    CardActions,
    DoistCardBridgeFactory,
    IntegrationException,
    isForbiddenError,
    isUnauthorizedError,
    Submit,
    TranslationService,
} from '@doist/ui-extensions-server'

import { BadRequestException, Injectable } from '@nestjs/common'

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
        private readonly appTokenService: AppTokenService,
        private readonly analyticsService: AnalyticsService,
    ) {
        super()
    }

    private isFromProject(request: DoistCardRequest): boolean {
        const contextData = request.action.params as ContextMenuData | undefined

        return contextData?.source === 'project'
    }

    async getInitialView(request: DoistCardRequest): Promise<DoistCardResponse> {
        if (!(await this.googleSheetsService.isAuthenticated(request.context.user.id))) {
            return this.googleLoginService.getAuthentication(request.context, true)
        }

        return request.extensionType === 'settings'
            ? this.getSettingsCard(request)
            : this.getHomeCard(request)
    }

    @Submit({ actionId: CardActions.LogOut })
    async logout(request: DoistCardRequest): Promise<DoistCardResponse> {
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
        const { context, action } = request

        const user = await this.userDatabaseService.getUser(context.user.id)
        if (!user) {
            return this.googleLoginService.getAuthentication(context)
        }

        const token = await this.googleSheetsService.getCurrentOrRefreshedToken(context.user.id)
        if (!token) {
            return this.logout(request)
        }

        if (!action.inputs) {
            throw new IntegrationException({
                error: new BadRequestException(),
            })
        }

        const appToken = this.appTokenService.appToken
        if (!appToken) {
            throw new IntegrationException({
                error: new BadRequestException('Missing authentication token'),
            })
        }

        const contextData = action.params as ContextMenuData
        const todoistClient = new TodoistApi(appToken)

        const exportOptions = getExportOptions(action.inputs)

        let tasks: Task[] = []
        let sections: Section[] = []

        try {
            tasks = await todoistClient.getTasks({ projectId: String(contextData.sourceId) })

            if (tasks.length === 0) {
                return {
                    card: this.adaptiveCardsService.noTasksCard({
                        projectName: contextData.content,
                    }),
                }
            }

            // Only fetch sections if we're using them, otherwise it's a wasted call
            sections = exportOptions['section']
                ? await todoistClient.getSections(contextData.sourceId)
                : []
        } catch (error: unknown) {
            throw new IntegrationException({
                error,
                overrides: {
                    retryAction: action,
                },
            })
        }

        try {
            const csvData = convertTasksToCsvString({
                tasks,
                sections,
                exportOptions,
            })

            const sheetUrl = await this.googleSheetsService.exportToSheets({
                title: this.createSheetName(contextData.content),
                csvData: csvData,
                authToken: token.token,
            })

            return {
                bridges: [
                    DoistCardBridgeFactory.createNotificationBridge({
                        text: this.translationService.getTranslation(Sheets.EXPORT_COMPLETED),
                        type: 'success',
                        actionText: this.translationService.getTranslation(Sheets.VIEW_SHEET),
                        actionUrl: sheetUrl,
                    }),
                    DoistCardBridgeFactory.finished,
                ],
            }
        } catch (error: unknown) {
            if (isUnauthorizedError(error) || isForbiddenError(error)) {
                // If we have become unauthorized, we need to treat this like a sign out
                // so tokens need to be removed.
                return this.logout(request)
            }

            throw new IntegrationException({
                error,
                overrides: {
                    retryAction: action,
                },
            })
        }
    }

    private createSheetName(projectName: string): string {
        return formatString(
            this.translationService.getTranslation(Sheets.SHEET_TITLE),
            projectName,
            new Date().toLocaleDateString(),
        )
    }

    private getHomeCard(request: DoistCardRequest): Promise<DoistCardResponse> {
        if (!this.isFromProject(request)) {
            return Promise.resolve({ card: this.adaptiveCardsService.projectOnlyCard() })
        }
        const contextData = request.action.params as ContextMenuData
        const card = this.adaptiveCardsService.homeCard({
            projectName: contextData.content,
        })
        return Promise.resolve({ card })
    }
}
