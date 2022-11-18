import {
    ActionsService as ActionsServiceBase,
    AdaptiveCardService as AdaptiveCardServiceBase,
    AppController,
    AuthenticationClient,
    AuthModule,
    CoreModule,
    ErrorModule,
    LoginCardInformation,
    LoginService,
    TokenValidator,
    UserDatabaseService as UserDatabaseServiceBase,
} from '@doist/ui-extensions-server'

import { Module } from '@nestjs/common'

import { Sheets } from '../i18n/en'
import { ActionsService } from '../services/actions.service'
import { AdaptiveCardService } from '../services/adaptive-card.service'
import { GoogleLoginService } from '../services/google-login.service'
import { GoogleSheetsService } from '../services/google-sheets.service'
import { UserDatabaseService } from '../services/user-database.service'

import { ConfigurationModule } from './configuration.module'
import { DatabaseModule } from './database.module'

@Module({
    imports: [
        ConfigurationModule,
        CoreModule,
        DatabaseModule,
        AuthModule.forRoot({
            imports: [AppModule],
            success: {
                imageSrc: '/images/google-success.png',
                altText: Sheets.LOGIN_SUCCESSFUL,
            },
            error: {
                imageSrc: '/images/google-error.png',
                helpCenterLink: Sheets.HELP_CENTER_LINK,
            },
            appName: 'Todoist',
            providers: [
                LoginService,
                GoogleSheetsService,
                {
                    provide: TokenValidator,
                    useFactory: (client: GoogleSheetsService) =>
                        new TokenValidator(
                            (token: string) => client.hasValidToken(token),
                            '/token-error.html',
                        ),
                    inject: [GoogleSheetsService],
                },
                {
                    provide: AuthenticationClient,
                    useExisting: GoogleSheetsService,
                },
                {
                    provide: GoogleLoginService,
                    useExisting: LoginService,
                },
                {
                    provide: LoginService.OPTIONS,
                    useValue: {
                        loginTitle: Sheets.LOGIN_TITLE,
                        loginInstructions: Sheets.LOGIN_INSTRUCTIONS,
                        learnMoreLink: Sheets.LEARN_MORE_LINK,
                        loginCardVersion: 'v2',
                    } as LoginCardInformation,
                },
            ],
            exports: [GoogleSheetsService, GoogleLoginService],
        }),
        ErrorModule.forRoot({
            errorCardOptions: {
                helpCenterLink: Sheets.HELP_CENTER_LINK,
            },
        }),
    ],
    providers: [
        AdaptiveCardService,
        {
            provide: AdaptiveCardServiceBase,
            useExisting: AdaptiveCardService,
        },
        {
            provide: ActionsServiceBase,
            useExisting: ActionsService,
        },
        {
            provide: UserDatabaseServiceBase,
            useExisting: UserDatabaseService,
        },
        UserDatabaseService,
        ActionsService,
    ],
    controllers: [AppController],
    exports: [
        AdaptiveCardService,
        AdaptiveCardServiceBase,
        UserDatabaseService,
        UserDatabaseServiceBase,
        ActionsService,
    ],
})
export class AppModule {}
