import { User as UserBase } from '@doist/ui-extensions-server'

import { Entity } from 'typeorm'

@Entity()
export class User extends UserBase {}

export function userFrom(props: {
    id?: number
    twistId: number
    authToken: string
    refreshToken?: string
    tokenExpiresAt?: Date
    externalUserId: string
    emailAddress?: string
    name?: string
}): User {
    const user = new User()
    Object.assign(user, props)
    return user
}
