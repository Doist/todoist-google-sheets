import { UserDatabaseService as UserDatabaseServiceBase } from '@doist/ui-extensions-server'

import { Injectable } from '@nestjs/common'

import type { User } from '../entities/user.entity'

@Injectable()
export class UserDatabaseService extends UserDatabaseServiceBase<User> {
    override async getUser(userId: number): Promise<User | undefined> {
        // eslint-disable-next-line no-console
        console.log(
            `[AUTH] ${new Date().toISOString()} - UserDatabaseService.getUser: Looking up user, userId: ${userId}`,
        )

        try {
            const user = await super.getUser(userId)

            // eslint-disable-next-line no-console
            console.log(
                `[AUTH] ${new Date().toISOString()} - UserDatabaseService.getUser: User lookup complete`,
                {
                    userId,
                    userFound: Boolean(user),
                    hasAuthToken: Boolean(user?.authToken),
                    hasRefreshToken: Boolean(user?.refreshToken),
                    hasExternalUserId: Boolean(user?.externalUserId),
                },
            )

            return user
        } catch (error: unknown) {
            // eslint-disable-next-line no-console
            console.error(
                `[AUTH] ${new Date().toISOString()} - UserDatabaseService.getUser: Failed to get user`,
                {
                    userId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    errorName: error instanceof Error ? error.constructor.name : typeof error,
                    errorStack: error instanceof Error ? error.stack : undefined,
                },
            )
            throw error
        }
    }

    override async removeToken(userId: number): Promise<void> {
        // eslint-disable-next-line no-console
        console.log(
            `[AUTH] ${new Date().toISOString()} - UserDatabaseService.removeToken: Removing token for user, userId: ${userId}`,
        )

        try {
            await super.removeToken(userId)

            // eslint-disable-next-line no-console
            console.log(
                `[AUTH] ${new Date().toISOString()} - UserDatabaseService.removeToken: Token removed successfully`,
                {
                    userId,
                },
            )
        } catch (error: unknown) {
            // eslint-disable-next-line no-console
            console.error(
                `[AUTH] ${new Date().toISOString()} - UserDatabaseService.removeToken: Failed to remove token`,
                {
                    userId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    errorName: error instanceof Error ? error.constructor.name : typeof error,
                    errorStack: error instanceof Error ? error.stack : undefined,
                },
            )
            throw error
        }
    }
}
