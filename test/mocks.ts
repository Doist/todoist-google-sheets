export function mockConnection(): Record<string, unknown> {
    const mockRepo = {
        find: jest.fn(),
        findOne: jest.fn(),
        findOneBy: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        clear: jest.fn(),
    }

    return {
        getRepository: jest.fn(() => mockRepo),
        getMongoRepository: jest.fn(() => mockRepo),
        getTreeRepository: jest.fn(() => mockRepo),
        close: jest.fn(),
        destroy: jest.fn(),
        options: {
            type: 'mysql',
            entities: [],
        },
        entityMetadatas: [],
        isInitialized: true,
    }
}
