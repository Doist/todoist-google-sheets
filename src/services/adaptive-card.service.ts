import { formatString } from '@doist/integrations-common'
import {
    ActionSet,
    CardElement,
    Column,
    ColumnSet,
    Container,
    createIconButton,
    DoistCard,
    DoistCardActionData,
    DoistCardExtensionType,
    Image,
    OpenUrlAction,
    RichTextBlock,
    SubmitAction,
    TextBlock,
    TextRun,
    ToggleInput,
} from '@doist/ui-extensions-core'
import {
    AdaptiveCardService as AdaptiveCardServiceBase,
    autoColumnSet,
    CardActions,
    columnSet,
    Core,
    createBackImageButton,
    createProfileDetails,
    createSignOutButton,
    LoginCardInformation,
    SETTINGS_IMAGE,
} from '@doist/ui-extensions-server'

import { Injectable } from '@nestjs/common'
import { chunk } from 'lodash'

import { CardActions as SheetsCardActions } from '../constants/card-actions'
import { Options, Sheets } from '../i18n/en'
import { ExportOptions, ExportOptionsNames } from '../types'

import type { User } from '../entities/user.entity'

export const PROFILE_DETAILS_ID = 'profile-details'
export const TITLE_ID = 'title'
export const OPTIONS_HEADER_ID = 'options-header'

const GOOGLE_SIGNIN_IMAGE = '/images/google-signin-{0}.png'

type HomeCardOptions = {
    projectName: string
}

type OptionsKeys = {
    [k in ExportOptions]: Options
}

const optionsTranslationKeys: OptionsKeys = {
    assignee: Options.ASSIGNEE,
    completed: Options.COMPLETED,
    createdDate: Options.CREATED_DATE,
    description: Options.DESCRIPTION,
    due: Options.DUE,
    priority: Options.PRIORITY,
    parentTask: Options.PARENT_TASK,
    section: Options.SECTION,
}

@Injectable()
export class AdaptiveCardService extends AdaptiveCardServiceBase {
    homeCard({ projectName }: HomeCardOptions): DoistCard {
        return DoistCard.fromWithItems({
            doistCardVersion: '0.6',
            items: [
                TextBlock.from({
                    text: this.translationService.getTranslation(Sheets.PROJECT_TITLE),
                    weight: 'bolder',
                }),
                TextBlock.from({
                    id: TITLE_ID,
                    text: projectName,
                    isSubtle: true,
                    wrap: true,
                }),
                this.createExportOptions(),

                ColumnSet.fromWithColumns({
                    spacing: 'medium',
                    columns: [
                        Column.fromWithItems({
                            items: [
                                createIconButton({
                                    action: SubmitAction.from({
                                        id: CardActions.Settings,
                                    }),
                                    buttonText: this.translationService.getTranslation(
                                        Sheets.GOOGLE_ACCOUNT,
                                    ),
                                    iconUrl: this.createThemeBasedUrl(SETTINGS_IMAGE),
                                    isSubtle: false,
                                }),
                            ],
                        }),
                        Column.fromWithItems({
                            items: [
                                this.createConfirmAndCancelActions({
                                    confirmationButtonKey: Sheets.EXPORT_BUTTON,
                                    confirmationButtonId: SheetsCardActions.Export,
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        })
    }

    settingsCard({ user }: { user: User }): DoistCard {
        const card = this.createEmptyCard()
        const header = this.createMainHeader({
            leftColumnContent: createBackImageButton(
                this,
                undefined,
                undefined,
                CardActions.GoHome,
            ),
            rightColumnContent: createSignOutButton(this),
            includeEmptySpacing: true,
        })

        card.addItem(header)

        const profileDetails = createProfileDetails(
            user,
            this.translationService.getTranslation(Sheets.PROFILE_DETAILS_WITH_NAME),
            this.translationService.getTranslation(Sheets.PROFILE_DETAILS_WITH_NO_NAME),
        )
        profileDetails.id = PROFILE_DETAILS_ID
        card.addItem(profileDetails)

        return card
    }

    noTasksCard({ projectName }: { projectName: string }): DoistCard {
        const card = this.createEmptyCard()

        card.addItem(
            TextBlock.from({
                text: formatString(
                    this.translationService.getTranslation(Sheets.NO_TASKS),
                    projectName,
                ),
                horizontalAlignment: 'center',
                spacing: 'extraLarge',
            }),
        )

        return card
    }

    loginCard({
        loginCardInformation,
        displayUnauthorized = false,
        continueButtonData,
        extensionType,
    }: {
        loginCardInformation: LoginCardInformation
        displayUnauthorized?: boolean
        continueButtonData?: () => DoistCardActionData | undefined
        extensionType?: DoistCardExtensionType
    }): DoistCard {
        const { authUrl, loginInstructions, loginTitle, learnMoreLink } = loginCardInformation
        return DoistCard.fromWithItems({
            doistCardVersion: '0.3',
            items: [
                // Unauthorised text, eg, if an external API has returned 403 and we need to
                // reauthenticate.
                ...(displayUnauthorized
                    ? [
                          TextBlock.from({
                              text: this.translationService.getTranslation(Core.UNAUTHORIZED),
                              color: 'attention',
                              wrap: true,
                          }),
                      ]
                    : []),
                // eg, "Did you already authenticate with Google?"
                TextBlock.from({
                    text: this.translationService.getTranslation(loginTitle),
                    wrap: true,
                }),
                Image.from({
                    url: this.createThemeBasedUrl(GOOGLE_SIGNIN_IMAGE),
                    selectAction: OpenUrlAction.from({
                        url: authUrl,
                    }),
                    pixelHeight: 40,
                    spacing: 'medium',
                }),
                // eg, "You need to connect this integration with Google to continue." with a
                // learn more link.
                RichTextBlock.fromWithInlines({
                    spacing: 'medium',
                    inlines: [
                        TextRun.from({
                            text: this.translationService.getTranslation(loginInstructions),
                            isSubtle: true,
                            size: 'small',
                        }),
                        ...(learnMoreLink
                            ? [
                                  TextRun.from({
                                      spacing: 'small',
                                      text: this.translationService.getTranslation(Core.LEARN_MORE),
                                      selectAction: OpenUrlAction.from({
                                          url: learnMoreLink,
                                      }),
                                      color: 'attention',
                                      size: 'small',
                                  }),
                              ]
                            : []),
                    ],
                }),
                columnSet(
                    ActionSet.fromWithActions({
                        spacing: 'large',
                        actions: [
                            SubmitAction.from({
                                id: CardActions.Close,
                                title: this.translationService.getTranslation(Core.CANCEL),
                            }),
                            SubmitAction.from({
                                id: CardActions.Continue,
                                title: this.translationService.getTranslation(
                                    Sheets.ALREADY_AUTHENTICATED,
                                ),
                                data: continueButtonData?.(),
                                associatedInputs: 'none',
                                style: 'positive',
                            }),
                        ],
                    }),
                    {
                        horizontalAlignment: extensionType === 'settings' ? undefined : 'right',
                        spacing: 'medium',
                    },
                ),
            ],
        })
    }

    private createMainHeader({
        leftColumnContent,
        middleColumnContent,
        rightColumnContent,
        includeEmptySpacing = false,
    }: {
        leftColumnContent?: CardElement
        middleColumnContent?: CardElement
        rightColumnContent?: CardElement
        includeEmptySpacing?: boolean
    } = {}): CardElement {
        const leftColumn = leftColumnContent ? [leftColumnContent] : []
        const middleColumn = middleColumnContent ? [middleColumnContent] : []
        const rightColumn = rightColumnContent ? [rightColumnContent] : []
        return this.createHeader(
            leftColumn,
            middleColumn,
            [autoColumnSet(rightColumn)],
            includeEmptySpacing,
        )
    }

    private createExportOptions(): CardElement {
        const container = Container.from({
            spacing: 'medium',
        })
        const optionsHeader = TextBlock.from({
            id: OPTIONS_HEADER_ID,
            text: this.translationService.getTranslation(Sheets.OPTIONS_HEADER),
            weight: 'bolder',
        })

        const columns = new ColumnSet()

        const leftColumn = new Column('stretch')
        const rightColumn = new Column('stretch')

        const toggleSwitches = ExportOptionsNames.map((option) =>
            ToggleInput.from({
                id: `Input.${option}`,
                title: this.translationService.getTranslation(optionsTranslationKeys[option]),
                defaultValue: 'true',
            }),
        )

        const [leftColumnItems, rightColumnItems] = chunk(
            toggleSwitches,
            (toggleSwitches.length / 2) | 0,
        )

        leftColumnItems?.forEach((item) => leftColumn.addItem(item))
        rightColumnItems?.forEach((item) => rightColumn.addItem(item))

        columns.addColumn(leftColumn)
        columns.addColumn(rightColumn)

        container.addItem(optionsHeader)
        container.addItem(columns)
        container.addItem(
            this.createTextWithLearnMore({
                textKey: Sheets.ALWAYS_EXPORTED,
                learnMoreUrl: Sheets.LEARN_MORE_LINK,
            }),
        )

        return container
    }
}
