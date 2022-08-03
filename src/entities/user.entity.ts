import { User as UserBase } from '@doist/ui-extensions-server'

import { Entity } from 'typeorm'

@Entity()
export class User extends UserBase {}
