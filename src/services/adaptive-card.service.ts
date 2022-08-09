import {
    CardElement,
    DoistCard,
    OpenUrlAction,
    RichTextBlock,
    SubmitAction,
    TextRun,
} from '@doist/ui-extensions-core'
import {
    AdaptiveCardService as AdaptiveCardServiceBase,
    autoColumnSet,
    CardActions,
    Core,
    createHeader,
    createIconImage,
    SETTINGS_IMAGE,
} from '@doist/ui-extensions-server'

import { Injectable } from '@nestjs/common'

import { Sheets } from '../i18n/en'

@Injectable()
export class AdaptiveCardService extends AdaptiveCardServiceBase {
    homeCard(): DoistCard {
        const card = this.createEmptyCard()
        const header = this.createMainHeader({
            leftColumnContent: createIconImage(this, {
                imagePath: SETTINGS_IMAGE,
                altText: this.translationService.getTranslation(Core.SETTINGS_TITLE),
                selectAction: SubmitAction.from({
                    id: CardActions.Settings,
                }),
            }),
            includeEmptySpacing: true,
        })

        card.addItem(header)

        return card
    }

    projectOnlyCard(): DoistCard {
        const card = this.createEmptyCard()

        const projectOnly = RichTextBlock.from({
            spacing: 'extraLarge',
        })

        projectOnly.addInline(
            TextRun.from({
                text: this.translationService.getTranslation(Sheets.PROJECT_ONLY),
            }),
        )
        projectOnly.addInline(
            TextRun.from({
                text: this.translationService.getTranslation(Core.LEARN_MORE),
                selectAction: OpenUrlAction.from({
                    url: this.translationService.getTranslation(Sheets.LEARN_MORE_LINK),
                    style: 'positive',
                }),
                color: 'attention',
            }),
        )

        card.addItem(projectOnly)

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
