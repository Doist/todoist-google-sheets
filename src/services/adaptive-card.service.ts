import { formatString } from '@doist/integrations-common'
import {
    CardElement,
    Column,
    ColumnSet,
    Container,
    DoistCard,
    SubmitAction,
    TextBlock,
    ToggleInput,
} from '@doist/ui-extensions-core'
import {
    AdaptiveCardService as AdaptiveCardServiceBase,
    autoColumnSet,
    CardActions,
    Core,
    createBackImageButton,
    createHeader,
    createIconImage,
    createProfileDetails,
    createSignOutButton,
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

type HomeCardOptions = {
    projectName: string
}

type OptionsKeys = {
    [k in ExportOptions]: Options
}

const optionsTranslationKeys: OptionsKeys = {
    assignee: Options.ASSIGNEE,
    author: Options.AUTHOR,
    content: Options.CONTENT,
    completed: Options.COMPLETED,
    createdDate: Options.CREATED_DATE,
    description: Options.DESCRIPTION,
    due: Options.DUE,
    priority: Options.PRIORITY,
    parentTask: Options.PARENT_TASK,
    section: Options.SECTION,
    timezone: Options.TIMEZONE,
}

@Injectable()
export class AdaptiveCardService extends AdaptiveCardServiceBase {
    homeCard({ projectName }: HomeCardOptions): DoistCard {
        const card = this.createEmptyCard()
        const header = this.createMainHeader({
            rightColumnContent: createIconImage(this, {
                imagePath: SETTINGS_IMAGE,
                altText: this.translationService.getTranslation(Core.SETTINGS_TITLE),
                selectAction: SubmitAction.from({
                    id: CardActions.Settings,
                }),
            }),
            middleColumnContent: TextBlock.from({
                id: TITLE_ID,
                text: formatString(
                    this.translationService.getTranslation(Sheets.MAIN_TITLE),
                    projectName,
                ),
                size: 'large',
            }),
        })

        card.addItem(header)

        card.addItem(this.createExportOptions())

        card.addAction(
            SubmitAction.from({
                title: this.translationService.getTranslation(Sheets.EXPORT_BUTTON),
                style: 'positive',
                id: SheetsCardActions.Export,
            }),
        )

        return card
    }

    private createExportOptions(): CardElement {
        const container = Container.from({
            spacing: 'medium',
        })
        const optionsHeader = TextBlock.from({
            id: OPTIONS_HEADER_ID,
            text: this.translationService.getTranslation(Sheets.OPTIONS_HEADER),
            isSubtle: true,
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

        const [leftColumnItems, rightColumnItems] = chunk(toggleSwitches, 6)

        leftColumnItems?.forEach((item) => leftColumn.addItem(item))
        rightColumnItems?.forEach((item) => rightColumn.addItem(item))

        columns.addColumn(leftColumn)
        columns.addColumn(rightColumn)

        container.addItem(columns)
        container.addItem(optionsHeader)

        return container
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
        return createHeader(
            this,
            leftColumn,
            middleColumn,
            [autoColumnSet(rightColumn)],
            includeEmptySpacing,
        )
    }
}
