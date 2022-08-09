import { buildOptions, buildSection, buildTask } from '../../test/fixtures'

import { convertTasksToCsvString } from './csv-helpers'

describe('CSV Helpers', () => {
    describe('convertTasksToCsvString', () => {
        describe('header', () => {
            it('displays all header items when all options are true', () => {
                const result = convertTasksToCsvString({
                    tasks: [],
                    sections: [],
                    exportOptions: buildOptions(),
                })

                expect(result).toEqual(
                    'taskId,content,sectionId,parentTaskId,completed,due,priority,description,parentTask,section,assignee,createdDate',
                )
            })

            it('displays the non-optional headers if all others are turned off', () => {
                const result = convertTasksToCsvString({
                    tasks: [],
                    sections: [],
                    exportOptions: {
                        completed: false,
                        due: false,
                        priority: false,
                        description: false,
                        parentTask: false,
                        section: false,
                        assignee: false,
                        createdDate: false,
                    },
                })
                expect(result).toEqual('taskId,content,sectionId,parentTaskId')
            })

            it('displays correct headers when some options are turned off', () => {
                const result = convertTasksToCsvString({
                    tasks: [],
                    sections: [],
                    exportOptions: {
                        completed: true,
                        due: true,
                        priority: false,
                        description: true,
                        parentTask: false,
                        section: false,
                        assignee: false,
                        createdDate: false,
                    },
                })

                expect(result).toEqual(
                    'taskId,content,sectionId,parentTaskId,completed,due,description',
                )
            })
        })

        describe('rows', () => {
            it('displays all data in the row when all options are true', () => {
                const result = convertTasksToCsvString({
                    tasks: [
                        buildTask({
                            overrides: {
                                content: 'My awesome task',
                                sectionId: 1234,
                                due: {
                                    string: '2022-08-09',
                                    recurring: false,
                                    date: new Date('2022-08-09').toISOString(),
                                },
                                priority: 4,
                                description: 'This is a description',
                                created: new Date(2022, 7, 5).toISOString(),
                                assignee: 12345,
                            },
                        }),
                    ],
                    sections: [
                        buildSection({
                            overrides: {
                                id: 1234,
                                name: 'My awesome section',
                            },
                        }),
                    ],
                    exportOptions: buildOptions(),
                })

                const rows = result.split('\n')

                expect(rows[1]).toEqual(
                    '10000001,My awesome task,1234,,false,,4,This is a description,,My awesome section,,2022-08-05T00:00:00.000Z',
                )
            })

            it('does not include fields when excluded by options (eg, section and description)', () => {
                const result = convertTasksToCsvString({
                    tasks: [
                        buildTask({
                            overrides: {
                                id: 10000001,
                                content: 'My awesome task',
                                sectionId: 1234,
                                due: {
                                    string: '2022-08-09',
                                    recurring: false,
                                    date: new Date('2022-08-09').toISOString(),
                                },
                                priority: 4,
                                description: 'This is a description',
                                created: new Date(2022, 7, 5).toISOString(),
                                assignee: 12345,
                            },
                        }),
                    ],
                    sections: [],
                    exportOptions: buildOptions({
                        overrides: {
                            section: false,
                            description: false,
                        },
                    }),
                })

                const rows = result.split('\n')

                expect(rows[1]).toEqual(
                    '10000001,My awesome task,1234,,false,,4,,,2022-08-05T00:00:00.000Z',
                )
            })
        })
    })
})
