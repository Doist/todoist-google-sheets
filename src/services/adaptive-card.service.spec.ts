import { CardActions, CoreModule } from '@doist/ui-extensions-server'

import { Test } from '@nestjs/testing'

import { buildUser } from '../../test/fixtures'

import { AdaptiveCardService, PROFILE_DETAILS_ID } from './adaptive-card.service'

import type { TextBlock } from '@doist/ui-extensions-core'

describe('AdaptiveCardService', () => {
    let target: AdaptiveCardService

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
            providers: [AdaptiveCardService],
        }).compile()

        target = await moduleRef.resolve(AdaptiveCardService)
    })

    describe('settingsCard', () => {
        it('contains a sign out button', () => {
            const user = buildUser({
                overrides: {
                    name: 'Ian Malcolm',
                    emailAddress: 'ian@ingen.com',
                },
            })
            const card = target.settingsCard({ user })
            const signOutButton = card.getActionById(CardActions.LogOut)
            expect(signOutButton).toBeDefined()
        })

        it('contains the right string if name and email present', () => {
            const user = buildUser({
                overrides: {
                    name: 'Ian Malcolm',
                    emailAddress: 'ian@ingen.com',
                },
            })
            const card = target.settingsCard({ user })
            const profileDetails = card.getElementById(PROFILE_DETAILS_ID) as TextBlock
            expect(profileDetails.text).toEqual(
                'You’re connected to Google as **Ian Malcolm** (ian@ingen.com).',
            )
        })

        it('contains the right string if name not present', () => {
            const user = buildUser({
                overrides: {
                    name: undefined,
                    emailAddress: 'ian@ingen.com',
                },
            })
            const card = target.settingsCard({ user })
            const profileDetails = card.getElementById(PROFILE_DETAILS_ID) as TextBlock
            expect(profileDetails.text).toEqual('You’re connected to Google as **ian@ingen.com**.')
        })
    })
})
