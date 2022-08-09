import { UserDatabaseService as UserDatabaseServiceBase } from '@doist/ui-extensions-server'

import { Injectable } from '@nestjs/common'

import type { User } from '../entities/user.entity'

@Injectable()
export class UserDatabaseService extends UserDatabaseServiceBase<User> {}
