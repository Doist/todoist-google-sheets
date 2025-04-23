import { Section, Task, TodoistApi } from '@doist/todoist-api-typescript'
import { CoreModule, StateService } from '@doist/ui-extensions-server'

import { HttpModule } from '@nestjs/axios'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import MockDate from 'mockdate'

import { buildUser } from '../../test/fixtures'
import {
    setupGetAppToken,
    setupGetGoogleToken,
    setupGetTasks,
    setupGetUser,
} from '../../test/setups'
import { CardActions as SheetCardActions } from '../constants/card-actions'
import { User } from '../entities/user.entity'
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
    })

    afterAll(() => {
        MockDate.reset()
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

        it('does not make a call to get completed items if completed items not required', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')
            setupGetTasks()

            jest.spyOn(target['googleSheetsService'], 'exportToSheets').mockImplementation(() =>
                Promise.resolve(undefined),
            )

            const getCompletedItems = jest.spyOn(TodoistService.prototype, 'getCompletedTasks')

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
                        [Inputs.IncludeCompleted]: 'false',
                    },
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            expect(getCompletedItems).not.toHaveBeenCalled()
        })

        it('does make a call to get completed items if completed items are required', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')
            setupGetTasks()

            jest.spyOn(target['googleSheetsService'], 'exportToSheets').mockImplementation(() =>
                Promise.resolve(undefined),
            )

            const getCompletedItems = jest
                .spyOn(TodoistService.prototype, 'getCompletedTasks')
                .mockImplementation(() => Promise.resolve({ tasks: [], completedInfo: [] }))

            jest.spyOn(TodoistService.prototype, 'getCompletedInfo').mockImplementation(() =>
                Promise.resolve([]),
            )

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

            expect(getCompletedItems).toHaveBeenCalled()
        })

        it('fetches completed tasks for tasks with completed subtasks', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')

            const parentTask = {
                id: 'parent1',
                projectId: '1234',
                content: 'Parent Task',
                isCompleted: false,
            } as Task

            jest.spyOn(TodoistApi.prototype, 'getTasks').mockImplementation(() =>
                Promise.resolve({ results: [parentTask], nextCursor: null }),
            )
            jest.spyOn(TodoistService.prototype, 'getCompletedInfo').mockImplementation(() =>
                Promise.resolve([{ item_id: 'parent1', completed_items: 2 }]),
            )

            const completedSubtasks = [
                {
                    id: 'sub1',
                    projectId: '1234',
                    content: 'Subtask 1',
                    description: '',
                    isCompleted: true,
                },
                {
                    id: 'sub2',
                    projectId: '1234',
                    content: 'Subtask 2',
                    description: '',
                    isCompleted: true,
                },
            ] as Task[]

            const getCompletedTasks = jest
                .spyOn(TodoistService.prototype, 'getCompletedTasks')
                .mockImplementation(({ taskId }) => {
                    if (taskId === 'parent1') {
                        return Promise.resolve({
                            tasks: completedSubtasks,
                            completedInfo: [
                                { item_id: 'sub1', completed_items: 0 },
                                { item_id: 'sub2', completed_items: 0 },
                            ],
                        })
                    }
                    return Promise.resolve({ tasks: [], completedInfo: [] })
                })

            jest.spyOn(target['googleSheetsService'], 'exportToSheets').mockImplementation(() =>
                Promise.resolve('https://docs.google.com'),
            )

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

            expect(getCompletedTasks).toHaveBeenCalledWith(
                expect.objectContaining({ taskId: 'parent1' }),
            )
        })

        it('fetches completed tasks for sections with completed tasks', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')
            setupGetTasks()

            const sections: Section[] = [
                {
                    id: 'section1',
                    projectId: '1234',
                    name: 'Section 1',
                    userId: 'user1',
                    isDeleted: false,
                    isCollapsed: false,
                    isArchived: false,
                    archivedAt: null,
                    addedAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                    sectionOrder: 1,
                },
            ]
            jest.spyOn(TodoistApi.prototype, 'getSections').mockImplementation(() =>
                Promise.resolve({ results: sections, nextCursor: null }),
            )

            jest.spyOn(TodoistService.prototype, 'getCompletedInfo').mockImplementation(() =>
                Promise.resolve([{ section_id: 'section1', completed_items: 1 }]),
            )

            const completedTask = {
                id: 'task1',
                projectId: '1234',
                content: 'Task 1',
                description: '',
                isCompleted: true,
            } as Task

            const getCompletedTasks = jest
                .spyOn(TodoistService.prototype, 'getCompletedTasks')
                .mockImplementation(({ sectionId }) => {
                    if (sectionId === 'section1') {
                        return Promise.resolve({
                            tasks: [completedTask],
                            completedInfo: [{ item_id: 'task1', completed_items: 0 }],
                        })
                    }
                    return Promise.resolve({ tasks: [], completedInfo: [] })
                })

            jest.spyOn(target['googleSheetsService'], 'exportToSheets').mockImplementation(() =>
                Promise.resolve('https://docs.google.com'),
            )

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
                        'Input.section': 'true',
                    },
                },
                extensionType: 'context-menu',
                maximumDoistCardVersion: 0.5,
            })

            expect(getCompletedTasks).toHaveBeenCalledWith(
                expect.objectContaining({ sectionId: 'section1' }),
            )
        })

        it('recursively fetches completed subtasks of completed tasks', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')

            const parentTask = {
                id: 'parent1',
                projectId: '1234',
                content: 'Parent Task',
                description: '',
                isCompleted: false,
            } as Task
            jest.spyOn(TodoistApi.prototype, 'getTasks').mockImplementation(() =>
                Promise.resolve({ results: [parentTask], nextCursor: null }),
            )

            jest.spyOn(TodoistService.prototype, 'getCompletedInfo').mockImplementation(() =>
                Promise.resolve([{ item_id: 'parent1', completed_items: 2 }]),
            )

            const completedSubtasks = [
                {
                    id: 'sub1',
                    projectId: '1234',
                    content: 'Subtask 1',
                    description: '',
                    isCompleted: true,
                },
            ] as Task[]

            const completedSubSubtasks = [
                {
                    id: 'subsub1',
                    projectId: '1234',
                    content: 'Sub-subtask 1',
                    description: '',
                    isCompleted: true,
                },
            ] as Task[]

            const getCompletedTasks = jest
                .spyOn(TodoistService.prototype, 'getCompletedTasks')
                .mockImplementation(({ taskId }) => {
                    if (taskId === 'parent1') {
                        return Promise.resolve({
                            tasks: completedSubtasks,
                            completedInfo: [{ item_id: 'sub1', completed_items: 1 }],
                        })
                    }
                    if (taskId === 'sub1') {
                        return Promise.resolve({
                            tasks: completedSubSubtasks,
                            completedInfo: [],
                        })
                    }
                    return Promise.resolve({ tasks: [], completedInfo: [] })
                })

            jest.spyOn(target['googleSheetsService'], 'exportToSheets').mockImplementation(() =>
                Promise.resolve('https://docs.google.com'),
            )

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

            expect(getCompletedTasks).toHaveBeenCalledWith(
                expect.objectContaining({ projectId: '1234' }),
            )
            expect(getCompletedTasks).toHaveBeenCalledWith(
                expect.objectContaining({ taskId: 'parent1' }),
            )
            expect(getCompletedTasks).toHaveBeenCalledWith(
                expect.objectContaining({ taskId: 'sub1' }),
            )
            expect(getCompletedTasks).toHaveBeenCalledTimes(3)
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
