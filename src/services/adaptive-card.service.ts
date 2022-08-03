import { DoistCard, SubmitAction, TextBlock } from '@doist/ui-extensions-core'
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

        const projectOnlyInfo = TextBlock.from({
            text: this.translationService.getTranslation(Sheets.PROJECT_ONLY),
            horizontalAlignment: 'center',
            spacing: 'extraLarge',
        })

        card.addItem(projectOnlyInfo)

        return card
    }
}
