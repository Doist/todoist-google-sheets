import {
    DoistCard,
    OpenUrlAction,
    RichTextBlock,
    SubmitAction,
    TextRun,
} from '@doist/ui-extensions-core'
import {
    AdaptiveCardService as AdaptiveCardServiceBase,
    CardActions,
    Core,
} from '@doist/ui-extensions-server'

import { Injectable } from '@nestjs/common'

import { Sheets } from '../i18n/en'

@Injectable()
export class AdaptiveCardService extends AdaptiveCardServiceBase {
    homeCard(): DoistCard {
        const card = this.createEmptyCard()
        const action = SubmitAction.from({
            id: CardActions.LogOut,
            title: this.translationService.getTranslation(Core.LOGOUT),
        })

        card.addAction(action)

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
}
