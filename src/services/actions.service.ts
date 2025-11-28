import { formatString } from '@doist/integrations-common'
import {
    ActionsService as ActionsServiceBase,
    AnalyticsService,
    AppTokenService,
    CardActions,
    DoistCardBridgeFactory,
    IntegrationException,
    isForbiddenError,
    isUnauthorizedError,
    launchedEvent,
    launchedNotAuthenticated,
    loggedOutEvent,
    settingsOpenedEvent,
    Submit,
    TranslationService,
} from '@doist/ui-extensions-server'

import { BadRequestException, Injectable } from '@nestjs/common'

import { exportEvent } from '../analytics/events'
import { CardActions as SheetsCardActions } from '../constants/card-actions'
import { Sheets } from '../i18n/en'
import { batchExecute } from '../utils/batch-helpers'
import { convertTasksToCsvString } from '../utils/csv-helpers'
import { getExportOptions } from '../utils/input-helpers'

import { AdaptiveCardService } from './adaptive-card.service'
import { GoogleSheetsService } from './google-sheets.service'
import { CompletedInfo, TodoistService } from './todoist.service'
import { UserDatabaseService } from './user-database.service'

import type { Section } from '@doist/todoist-api-typescript'
import type {
    DoistCardRequest,
    DoistCardResponse,
    TodoistContextMenuData,
} from '@doist/ui-extensions-core'
import type { ExportOptionsToUse, Task } from '../types'

@Injectable()
export class ActionsService extends ActionsServiceBase {
    constructor(
        private readonly googleSheetsService: GoogleSheetsService,
        private readonly adaptiveCardsService: AdaptiveCardService,
        private readonly userDatabaseService: UserDatabaseService,
        private readonly translationService: TranslationService,
        private readonly appTokenService: AppTokenService,
        private readonly analyticsService: AnalyticsService,
        private readonly todoistService: TodoistService,
    ) {
        super()
    }

    async getInitialView(request: DoistCardRequest): Promise<DoistCardResponse> {
        if (!(await this.googleSheetsService.isAuthenticated(request.context.user.id))) {
            this.analyticsService.trackEvents([launchedNotAuthenticated])
            return this.getAuthentication(request, true)
        }

        return request.extensionType === 'settings'
            ? this.getSettingsCard(request)
            : this.getHomeCard(request)
    }

    private async getAuthentication(
        request: DoistCardRequest,
        isInitialLaunch = false,
    ): Promise<DoistCardResponse> {
        if (isInitialLaunch) {
            this.analyticsService.trackEvents([launchedNotAuthenticated])
        }

        const card = this.adaptiveCardsService.loginCard({
            loginCardInformation: {
                loginTitle: Sheets.LOGIN_TITLE,
                loginInstructions: Sheets.LOGIN_INSTRUCTIONS,
                learnMoreLink: Sheets.LEARN_MORE_LINK,
                authUrl: await this.googleSheetsService.getAuthorizationUrl(
                    request.context.user.id,
                ),
            },
            extensionType: request.extensionType,
        })

        return Promise.resolve({ card })
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
        this.analyticsService.trackEvents([loggedOutEvent])
        return this.getAuthentication(request)
    }

    @Submit({ actionId: CardActions.Settings })
    async getSettingsCard(request: DoistCardRequest): Promise<DoistCardResponse> {
        this.analyticsService.trackEvents([settingsOpenedEvent])
        const { context } = request
        const user = await this.userDatabaseService.getUser(context.user.id)
        if (!user) {
            return this.getAuthentication(request)
        }
        const card = this.adaptiveCardsService.settingsCard({ user })
        return { card }
    }

    @Submit({ actionId: SheetsCardActions.Export })
    async export(request: DoistCardRequest): Promise<DoistCardResponse> {
        const { context, action } = request

        const user = await this.userDatabaseService.getUser(context.user.id)
        if (!user) {
            return this.getAuthentication(request)
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

        const contextData = action.params as TodoistContextMenuData

        const exportOptions = getExportOptions(action.inputs)

        const { tasks, sections, collaborators } = await this.fetchData({
            appToken,
            contextData,
            exportOptions,
        }).catch((error: unknown) => {
            throw new IntegrationException({
                error,
                overrides: {
                    retryAction: action,
                },
            })
        })

        if (tasks.length === 0) {
            return {
                card: this.adaptiveCardsService.noTasksCard({
                    projectName: contextData.content,
                }),
            }
        }

        try {
            const csvData = convertTasksToCsvString({
                tasks,
                sections,
                collaborators,
                exportOptions,
            })

            const sheetUrl = await this.googleSheetsService.exportToSheets({
                title: this.createSheetName(contextData.content),
                csvData: csvData,
                authToken: token.token,
            })

            this.analyticsService.trackEvents([exportEvent])

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

    private async fetchData({
        appToken,
        contextData,
        exportOptions,
    }: {
        appToken: string
        contextData: TodoistContextMenuData
        exportOptions: ExportOptionsToUse
    }) {
        const [tasks, sections, collaborators] = await Promise.all([
            this.todoistService.getProjectTasks({
                token: appToken,
                projectId: contextData.sourceId,
            }),
            exportOptions['section']
                ? this.todoistService.getProjectSections({
                      token: appToken,
                      projectId: contextData.sourceId,
                  })
                : Promise.resolve([]),
            exportOptions['assignee']
                ? this.todoistService.getProjectCollaborators({
                      token: appToken,
                      projectId: contextData.sourceId,
                  })
                : Promise.resolve([]),
        ])

        let completedTasks: Task[] = []
        if (exportOptions.includeCompleted) {
            const syncCompletedInfo = await this.todoistService.getCompletedInfo({
                token: appToken,
            })

            completedTasks = await this.fetchCompletedTasksForProject({
                appToken,
                projectId: contextData.sourceId,
                tasks,
                sections,
                syncCompletedInfo,
            })
        }

        return {
            tasks: [...tasks, ...completedTasks],
            sections,
            collaborators,
        }
    }

    private async fetchCompletedTasksForProject(params: {
        appToken: string
        projectId: string
        tasks: Task[]
        sections: Section[]
        syncCompletedInfo: CompletedInfo[]
    }): Promise<Task[]> {
        const { appToken, projectId, tasks, sections, syncCompletedInfo } = params

        const taskIdsWithCompletedSubtasks = this.findTaskIdsWithCompletedSubtasks(
            syncCompletedInfo,
            tasks,
        )
        const sectionIdsWithCompletedTasks = this.findSectionIdsWithCompletedTasks(
            syncCompletedInfo,
            sections,
        )

        const [projectCompletdTasks, taskCompletedTasks, sectionCompletedTasks] = await Promise.all(
            [
                this.fetchCompletedTasksForProjectId(appToken, projectId),
                this.fetchCompletedTasksForTaskIds(appToken, taskIdsWithCompletedSubtasks),
                this.fetchCompletedTasksForSectionIds(appToken, sectionIdsWithCompletedTasks),
            ],
        )

        let allCompletedInfo = [
            ...projectCompletdTasks.completedInfo,
            ...taskCompletedTasks.completedInfo,
            ...sectionCompletedTasks.completedInfo,
        ]
        let allCompletedTasks = [
            ...projectCompletdTasks.tasks,
            ...taskCompletedTasks.tasks,
            ...sectionCompletedTasks.tasks,
        ]

        let completedTasksIdsWithCompletedSubtasks = this.findTaskIdsWithCompletedSubtasks(
            allCompletedInfo,
            allCompletedTasks,
        )

        // completed tasks can have completed subtasks, so we need to loop
        // until no more completed subtasks are found
        while (completedTasksIdsWithCompletedSubtasks.size > 0) {
            const subtaskResult = await this.fetchCompletedTasksForTaskIds(
                appToken,
                completedTasksIdsWithCompletedSubtasks,
            )

            allCompletedTasks = [...allCompletedTasks, ...subtaskResult.tasks]
            allCompletedInfo = [...allCompletedInfo, ...subtaskResult.completedInfo]

            completedTasksIdsWithCompletedSubtasks = this.findTaskIdsWithCompletedSubtasks(
                allCompletedInfo,
                subtaskResult.tasks,
            )
        }

        return allCompletedTasks
    }

    private async fetchCompletedTasksForProjectId(
        appToken: string,
        projectId: string,
    ): Promise<{ tasks: Task[]; completedInfo: CompletedInfo[] }> {
        try {
            return await this.todoistService.getCompletedTasks({
                token: appToken,
                projectId,
            })
        } catch (error: unknown) {
            return { tasks: [], completedInfo: [] }
        }
    }

    private async fetchCompletedTasksForTaskIds(
        appToken: string,
        taskIds: Set<string>,
    ): Promise<{ tasks: Task[]; completedInfo: CompletedInfo[] }> {
        if (taskIds.size === 0) {
            return { tasks: [], completedInfo: [] }
        }

        // Use batched execution to limit concurrent API calls to 10 at a time
        // This prevents overwhelming the API when there are many tasks with completed subtasks
        const results = await batchExecute(
            Array.from(taskIds),
            (taskId) =>
                this.todoistService.getCompletedTasks({
                    token: appToken,
                    taskId,
                }),
            10, // Max 10 concurrent requests
        )

        const tasks = results.flatMap((result) => result.tasks)
        const completedInfo = results.flatMap((result) => result.completedInfo)

        return { tasks, completedInfo }
    }

    private async fetchCompletedTasksForSectionIds(
        appToken: string,
        sectionIds: Set<string>,
    ): Promise<{ tasks: Task[]; completedInfo: CompletedInfo[] }> {
        if (sectionIds.size === 0) {
            return { tasks: [], completedInfo: [] }
        }

        // Use batched execution to limit concurrent API calls to 10 at a time
        // This prevents overwhelming the API when there are many sections with completed tasks
        const results = await batchExecute(
            Array.from(sectionIds),
            (sectionId) =>
                this.todoistService.getCompletedTasks({
                    token: appToken,
                    sectionId,
                }),
            10, // Max 10 concurrent requests
        )

        const tasks = results.flatMap((result) => result.tasks)
        const completedInfo = results.flatMap((result) => result.completedInfo)

        return { tasks, completedInfo }
    }

    private findTaskIdsWithCompletedSubtasks(
        completedInfo: CompletedInfo[],
        tasks: Task[],
    ): Set<string> {
        const taskIds = new Set<string>()
        const activeTaskIds = new Set(tasks.map((task) => task.id))

        // Find tasks that have completed subtasks and are in our active tasks list
        completedInfo.forEach((info) => {
            if (info.item_id && activeTaskIds.has(info.item_id)) {
                taskIds.add(info.item_id)
            }
        })

        return taskIds
    }

    private findSectionIdsWithCompletedTasks(
        completedInfo: CompletedInfo[],
        sections: Section[],
    ): Set<string> {
        const sectionIds = new Set<string>()
        const activeSectionIds = new Set(sections.map((section) => section.id))

        // Find sections that have completed tasks and are in our active sections list
        completedInfo.forEach((info) => {
            if (info.section_id && activeSectionIds.has(info.section_id)) {
                sectionIds.add(info.section_id)
            }
        })

        return sectionIds
    }

    private createSheetName(projectName: string): string {
        return formatString(
            this.translationService.getTranslation(Sheets.SHEET_TITLE),
            projectName,
            new Date().toLocaleDateString(),
        )
    }

    private getHomeCard(request: DoistCardRequest): Promise<DoistCardResponse> {
        this.analyticsService.trackEvents([launchedEvent])
        const contextData = request.action.params as TodoistContextMenuData
        const card = this.adaptiveCardsService.homeCard({
            projectName: contextData.content,
        })
        return Promise.resolve({ card })
    }
}
