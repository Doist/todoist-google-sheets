import { TodoistApi } from '@doist/todoist-api-typescript'
import { CoreModule, StateService } from '@doist/ui-extensions-server'

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
import { AdaptiveCardService } from './adaptive-card.service'
import { GoogleLoginService } from './google-login.service'
import { GoogleSheetsService } from './google-sheets.service'
import { UserDatabaseService } from './user-database.service'

import type { ContextMenuData, DoistCardContextUser } from '@doist/ui-extensions-core'

describe('ActionsService', () => {
    let target: ActionsService

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
            providers: [
                ActionsService,
                GoogleSheetsService,
                AdaptiveCardService,
                UserDatabaseService,
                StateService,
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
            const getAuthentication = jest
                .spyOn(target['googleLoginService'], 'getAuthentication')
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

            expect(getAuthentication).toHaveBeenCalled()
        })

        it('does not send anything to google sheets if no tasks', async () => {
            setupGetUser(buildUser())
            setupGetGoogleToken('kwijibo')
            setupGetAppToken('kwijibo')

            jest.spyOn(TodoistApi.prototype, 'getTasks').mockImplementation(() =>
                Promise.resolve([]),
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
                .mockImplementation(() => Promise.resolve([]))

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
