import { DoistCard, SubmitAction } from '@doist/ui-extensions-core'
import {
    AdaptiveCardService as AdaptiveCardServiceBase,
    CardActions,
} from '@doist/ui-extensions-server'

import { Injectable } from '@nestjs/common'
// import { CardActions as SheetsCardActions } from '../constants/card-actions'

@Injectable()
export class AdaptiveCardService extends AdaptiveCardServiceBase {
    homeCard(): DoistCard {
        const card = this.createEmptyCard()
        const action = SubmitAction.from({
            id: CardActions.LogOut,
            title: this.translationService.getTranslation('LogOut'),
        })

        card.addAction(action)

        return card
    }
}
