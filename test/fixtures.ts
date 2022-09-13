import { faker } from '@faker-js/faker'
import { build, perBuild, sequence } from '@jackfranklin/test-data-bot'

import { User } from '../src/entities/user.entity'

import type { Section, Task } from '@doist/todoist-api-typescript'
import type { ExportOptionsToUse } from '../src/types'

export const buildUser = build<User>('User', {
    fields: {
        id: sequence((num) => num + 10000000),
        twistId: perBuild(() => faker.datatype.number(20)),
        authToken: perBuild(() => faker.internet.password()),
        refreshToken: perBuild(() => faker.internet.password()),
        externalUserId: perBuild(() => faker.datatype.uuid()),
        name: perBuild(() => faker.name.fullName()),
        emailAddress: perBuild(() => faker.internet.email()),
        set: User.prototype.set,
        update: User.prototype.update,
    },
})

export const buildOptions = build<ExportOptionsToUse>('ExportOptionsToUse', {
    fields: {
        assignee: true,
        due: true,
        completed: true,
        priority: true,
        description: true,
        parentTask: true,
        section: true,
        createdDate: true,
    },
})

export const buildTask = build<Task>('Task', {
    fields: {
        id: String(sequence((num) => num + 10000000)),
        commentCount: 0,
        content: perBuild(() => faker.lorem.sentence()),
        isCompleted: false,
        createdAt: perBuild(() => faker.date.recent().toDateString()),
        description: '',
        labels: [],
        order: 0,
        priority: 0,
        projectId: '12345',
        sectionId: '12345',
        url: '',
        creatorId: '123',
    },
})

export const buildSection = build<Section>('Section', {
    fields: {
        id: String(sequence((num) => num + 10000000)),
        name: perBuild(() => faker.lorem.sentence()),
        order: 0,
        projectId: '12345',
    },
})
