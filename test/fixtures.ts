import { faker } from '@faker-js/faker'
import { build, perBuild, sequence } from '@jackfranklin/test-data-bot'

import { User } from '../src/entities/user.entity'

export const buildUser = build<User>('User', {
    fields: {
        id: sequence((num) => num + 10000000),
        twistId: perBuild(() => faker.datatype.number(20)),
        authToken: perBuild(() => faker.internet.password()),
        refreshToken: perBuild(() => faker.internet.password()),
        externalUserId: perBuild(() => faker.datatype.uuid()),
        name: perBuild(() => faker.name.findName()),
        emailAddress: perBuild(() => faker.internet.email()),
        set: User.prototype.set,
        update: User.prototype.update,
    },
})
