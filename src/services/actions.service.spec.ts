import { TodoistApi } from '@doist/todoist-api-typescript'
import { CoreModule, StateService } from '@doist/ui-extensions-server'

import { HttpModule } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import MockDate from 'mockdate'

import { buildSyncTask, buildTask, buildUser } from '../../test/fixtures'
import { server } from '../../test/server'
import {
    setupGetAppToken,
    setupGetCompletedItems,
    setupGetGoogleToken,
    setupGetTasks,
    setupGetUser,
} from '../../test/setups'
import { CardActions as SheetCardActions } from '../constants/card-actions'
import { User } from '../entities/user.entity'
import { DELIMITER } from '../types'
import * as csvHelpers from '../utils/csv-helpers'

import { ActionsService } from './actions.service'
import { AdaptiveCardService, Inputs } from './adaptive-card.service'
import { GoogleLoginService } from './google-login.service'
import { GoogleSheetsService } from './google-sheets.service'
import { TodoistService } from './todoist.service'
import { UserDatabaseService } from './user-database.service'

import type { ContextMenuData, DoistCardContextUser } from '@doist/ui-extensions-core'

describe('ActionsService', () => {
    let target: ActionsService

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule, HttpModule],
            providers: [
                ActionsService,
                GoogleSheetsService,
                AdaptiveCardService,
                UserDatabaseService,
                StateService,
                TodoistService,
                {
                    provide: GoogleLoginService,
                    useFactory: jest.fn(() => ({
                        getAuthentication: jest.fn(),
                    })),
                },
                { provide: getRepositoryToken(User), useFactory: jest.fn() },
            ],
        }).compile()

        target = await moduleRef.resolve(ActionsService)
    })

    beforeAll(() => {
        MockDate.set(new Date(2022, 7, 8, 11, 26, 0))
        server.listen({ onUnhandledRequest: 'bypass' })
    })

    afterEach(() => server.resetHandlers())

    afterAll(() => {
        MockDate.reset()
        server.close()
    })

    describe('export', () => {
        it("triggers a logout if the user's token has expired", async () => {
            setupGetGoogleToken(undefined)
            setupGetUser(buildUser())

            const logout = jest
                .spyOn(target, 'logout')
                .mockImplementation(() => Promise.resolve({}))

            await target.export({
                context: { user: { id: 42 } as DoistCardContextUser, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: SheetCardActions.Export,
                    params: {
                        source: 'project',
                        sourceId: '1234',
                        url: 'https://google.com',
                        content: 'My Project',
                        contentPlain: 'My Project',
                    } as ContextMenuData,
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            expect(logout).toHaveBeenCalled()
        })

        it("returns the login screen if the user's token has expired", async () => {
            setupGetGoogleToken('kwijibo')
            setupGetUser(undefined)

            const { card } = await target.export({
                context: { user: { id: 42 } as DoistCardContextUser, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: SheetCardActions.Export,
                    params: {
                        source: 'project',
                        sourceId: '1234',
                        url: 'https://google.com',
                        content: 'My Project',
                        contentPlain: 'My Project',
                    } as ContextMenuData,
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            expect(JSON.stringify(card?.toJSON())).toMatch(
                /Before using this integration you need to sign in with Google. Do you want to authenticate with your Google account now\?/,
            )
        })

        it('does not send anything to google sheets if no tasks', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')

            jest.spyOn(TodoistApi.prototype, 'getTasks').mockImplementation(() =>
                Promise.resolve({ results: [], nextCursor: null }),
            )

            const noTasksCard = jest.spyOn(target['adaptiveCardsService'], 'noTasksCard')

            const exportToSheets = jest.spyOn(target['googleSheetsService'], 'exportToSheets')

            await target.export({
                context: { user: { id: 42 } as DoistCardContextUser, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: SheetCardActions.Export,
                    params: {
                        source: 'project',
                        sourceId: '1234',
                        url: 'https://google.com',
                        content: 'My Project',
                        contentPlain: 'My Project',
                    } as ContextMenuData,
                    inputs: {
                        'Input.completed': 'true',
                    },
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            expect(exportToSheets).not.toHaveBeenCalled()
            expect(noTasksCard).toHaveBeenCalled()
        })

        it('does not make a call to get sections if sections not required', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')
            setupGetTasks()

            jest.spyOn(target['googleSheetsService'], 'exportToSheets').mockImplementation(() =>
                Promise.resolve(undefined),
            )

            const getSections = jest.spyOn(TodoistApi.prototype, 'getSections')

            await target.export({
                context: { user: { id: 42 } as DoistCardContextUser, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: SheetCardActions.Export,
                    params: {
                        source: 'project',
                        sourceId: '1234',
                        url: 'https://google.com',
                        content: 'My Project',
                        contentPlain: 'My Project',
                    } as ContextMenuData,
                    inputs: {
                        'Input.section': 'false',
                    },
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            expect(getSections).not.toHaveBeenCalled()
        })

        it('does not make a call to get sections if sections not required', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')
            setupGetTasks()

            jest.spyOn(target['googleSheetsService'], 'exportToSheets').mockImplementation(() =>
                Promise.resolve(undefined),
            )

            const getSections = jest
                .spyOn(TodoistApi.prototype, 'getSections')
                .mockImplementation(() => Promise.resolve({ results: [], nextCursor: null }))

            await target.export({
                context: { user: { id: 42 } as DoistCardContextUser, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: SheetCardActions.Export,
                    params: {
                        source: 'project',
                        sourceId: '1234',
                        url: 'https://google.com',
                        content: 'My Project',
                        contentPlain: 'My Project',
                    } as ContextMenuData,
                    inputs: {
                        'Input.section': 'true',
                    },
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            expect(getSections).toHaveBeenCalled()
        })

        it.each([
            { includeCompleted: true, recentCount: 0, rowCount: 29 },
            { includeCompleted: true, recentCount: 3, rowCount: 32 },
            { includeCompleted: false, recentCount: 3, rowCount: 24 },
        ])(
            'exports $rowCount rows (includeCompleted=$includeCompleted, recent=$recentCount)',
            async ({ includeCompleted, recentCount, rowCount }) => {
                setupGetUser(buildUser())
                setupGetGoogleToken('kwijibo')
                setupGetAppToken('kwijibo')

                const activeTasks = Array.from({ length: 24 }, (_, index) =>
                    buildTask({
                        overrides: {
                            id: `active-${index}`,
                            content: `Active task ${index}`,
                            projectId: '1234',
                        },
                    }),
                )
                jest.spyOn(TodoistApi.prototype, 'getTasks').mockResolvedValue({
                    results: activeTasks,
                    nextCursor: null,
                })

                const oldTasks = Array.from({ length: 5 }, () =>
                    buildSyncTask({ overrides: { project_id: '1234' } }),
                )
                const recentTasks = Array.from({ length: recentCount }, () =>
                    buildSyncTask({
                        overrides: {
                            project_id: '1234',
                            completed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                        },
                    }),
                )
                const completedTasks = [...recentTasks, ...oldTasks]
                const completedRequests = setupGetCompletedItems(completedTasks)
                const exportToSheets = jest
                    .spyOn(target['googleSheetsService'], 'exportToSheets')
                    .mockResolvedValue('https://docs.google.com')

                await target.export({
                    context: { user: { id: 42 } as DoistCardContextUser, theme: 'light' },
                    action: {
                        actionType: 'submit',
                        actionId: SheetCardActions.Export,
                        params: {
                            source: 'project',
                            sourceId: '1234',
                            url: 'https://google.com',
                            content: 'My Project',
                            contentPlain: 'My Project',
                        } as ContextMenuData,
                        inputs: {
                            [Inputs.IncludeCompleted]: String(includeCompleted),
                        },
                    },
                    extensionType: 'context-menu',
                    maximumDoistCardVersion: 0.5,
                })

                const csvData = exportToSheets.mock.calls[0]?.[0].csvData ?? ''
                const [header, ...rows] = csvData.split('\n').map((row) => row.split(DELIMITER))
                const completedDateIndex = header?.indexOf('completedDate') ?? -1

                expect(rows).toHaveLength(rowCount)
                expect(
                    rows
                        .filter((row) => row[completedDateIndex])
                        .map((row) => ({ id: row[0], completedAt: row[completedDateIndex] })),
                ).toEqual(
                    includeCompleted
                        ? completedTasks.map((task) => ({
                              id: task.id,
                              completedAt: task.completed_at,
                          }))
                        : [],
                )
                const windowCount = Math.ceil(
                    (Date.now() - new Date('2006-01-01T00:00:00Z').getTime()) /
                        (90 * 24 * 60 * 60 * 1000),
                )
                expect(completedRequests).toHaveLength(includeCompleted ? windowCount : 0)
            },
        )

        it('exports subtasks completed before their completed parent', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')
            setupGetTasks()

            const parent = buildSyncTask({
                overrides: {
                    project_id: '1234',
                    completed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                },
            })
            const subtask = buildSyncTask({
                overrides: {
                    project_id: '1234',
                    parent_id: parent.id,
                    completed_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
                },
            })
            setupGetCompletedItems([parent, subtask])

            const exportToSheets = jest
                .spyOn(target['googleSheetsService'], 'exportToSheets')
                .mockResolvedValue('https://docs.google.com')

            await target.export({
                context: { user: { id: 42 } as DoistCardContextUser, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: SheetCardActions.Export,
                    params: {
                        source: 'project',
                        sourceId: '1234',
                        url: 'https://google.com',
                        content: 'My Project',
                        contentPlain: 'My Project',
                    } as ContextMenuData,
                    inputs: {
                        [Inputs.IncludeCompleted]: 'true',
                    },
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            const csvData = exportToSheets.mock.calls[0]?.[0].csvData ?? ''
            const ids = csvData
                .split('\n')
                .slice(1)
                .map((row) => row.split(DELIMITER)[0])

            expect(ids.filter((id) => id === parent.id)).toHaveLength(1)
            expect(ids.filter((id) => id === subtask.id)).toHaveLength(1)
        })

        it('passes the correct data through to google sheets service', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')
            setupGetTasks()

            const exportToSheets = jest
                .spyOn(target['googleSheetsService'], 'exportToSheets')
                .mockImplementation(() => Promise.resolve('https://docs.google.com'))
            jest.spyOn(csvHelpers, 'convertTasksToCsvString').mockImplementation(() => 'csv')

            await target.export({
                context: { user: { id: 42 } as DoistCardContextUser, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: SheetCardActions.Export,
                    params: {
                        source: 'project',
                        sourceId: '1234',
                        url: 'https://google.com',
                        content: 'My Project',
                        contentPlain: 'My Project',
                    } as ContextMenuData,
                    inputs: {
                        'Input.section': 'false',
                    },
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            expect(exportToSheets).toHaveBeenCalledWith({
                title: 'Todoist Export: My Project from 8/8/2022',
                csvData: 'csv',
                authToken: 'kwijibo',
            })
        })

        it('returns a notification bridge with the resulting URL', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')
            setupGetTasks()

            jest.spyOn(target['googleSheetsService'], 'exportToSheets').mockImplementation(() =>
                Promise.resolve('https://docs.google.com'),
            )
            jest.spyOn(csvHelpers, 'convertTasksToCsvString').mockImplementation(() => 'csv')

            const { bridges } = await target.export({
                context: { user: { id: 42 } as DoistCardContextUser, theme: 'light' },
                action: {
                    actionType: 'submit',
                    actionId: SheetCardActions.Export,
                    params: {
                        source: 'project',
                        sourceId: '1234',
                        url: 'https://google.com',
                        content: 'My Project',
                        contentPlain: 'My Project',
                    } as ContextMenuData,
                    inputs: {
                        'Input.section': 'false',
                    },
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            expect(bridges).toBeDefined()
            expect(bridges).toHaveLength(2)
            expect(bridges?.[0]).toMatchObject({
                bridgeActionType: 'display.notification',
                notification: {
                    type: 'success',
                    text: 'Export completed',
                    actionText: 'View sheet',
                    actionUrl: 'https://docs.google.com',
                },
            })
            expect(bridges?.[1]).toMatchObject({
                bridgeActionType: 'finished',
            })
        })
    })
})
