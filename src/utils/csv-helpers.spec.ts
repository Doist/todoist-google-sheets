import { buildCollaborator, buildOptions, buildSection, buildTask } from '../../test/fixtures'
import { DELIMITER } from '../types'

import { convertTasksToCsvString } from './csv-helpers'

const DEFAULT_ARGS = {
    tasks: [],
    sections: [],
    collaborators: [],
    exportOptions: buildOptions(),
}

describe('CSV Helpers', () => {
    describe('convertTasksToCsvString', () => {
        describe('header', () => {
            it('displays all header items when all options are true', () => {
                const result = convertTasksToCsvString(DEFAULT_ARGS)

                expect(result).toEqual(
                    toCustomCSV(
                        'taskId,taskName,sectionId,parentTaskId,completed,due,priority,description,parentTask,section,assignee,createdDate,labels',
                    ),
                )
            })

            it('displays the non-optional headers if all others are turned off', () => {
                const result = convertTasksToCsvString({
                    ...DEFAULT_ARGS,
                    exportOptions: {
                        completed: false,
                        due: false,
                        priority: false,
                        description: false,
                        parentTask: false,
                        section: false,
                        assignee: false,
                        createdDate: false,
                        includeCompleted: false,
                        labels: false,
                    },
                })
                expect(result).toEqual(toCustomCSV('taskId,taskName,sectionId,parentTaskId'))
            })

            it('displays correct headers when some options are turned off', () => {
                const result = convertTasksToCsvString({
                    ...DEFAULT_ARGS,
                    exportOptions: {
                        completed: true,
                        due: true,
                        priority: false,
                        description: true,
                        parentTask: false,
                        section: false,
                        assignee: false,
                        createdDate: false,
                        includeCompleted: false,
                        labels: false,
                    },
                })

                expect(result).toEqual(
                    toCustomCSV('taskId,taskName,sectionId,parentTaskId,completed,due,description'),
                )
            })

            it('displays the completedDate header when includeCompleted is true', () => {
                const result = convertTasksToCsvString({
                    ...DEFAULT_ARGS,
                    exportOptions: {
                        completed: false,
                        due: false,
                        priority: false,
                        description: false,
                        parentTask: false,
                        section: false,
                        assignee: false,
                        createdDate: false,
                        includeCompleted: true,
                        labels: false,
                    },
                })

                expect(result).toEqual(
                    toCustomCSV('taskId,taskName,sectionId,parentTaskId,completedDate'),
                )
            })
        })

        describe('rows', () => {
            it('displays all data in the row when all options are true', () => {
                const result = convertTasksToCsvString({
                    tasks: [
                        {
                            ...buildTask({
                                overrides: {
                                    content: 'My awesome task',
                                    sectionId: '1234',
                                    due: {
                                        string: '2022-08-09',
                                        isRecurring: false,
                                        date: new Date('2022-08-09').toISOString(),
                                    },
                                    priority: 4, // High priority, user will expect 1
                                    description: 'This is a description',
                                    createdAt: new Date(2022, 7, 5).toISOString(),
                                    assigneeId: '12345',
                                    labels: ['label1', 'label2'],
                                },
                            }),
                            completedAt: new Date(2022, 7, 6).toISOString(),
                        },
                    ],
                    sections: [
                        buildSection({
                            overrides: {
                                id: '1234',
                                name: 'My awesome section',
                            },
                        }),
                    ],
                    collaborators: [
                        buildCollaborator({ overrides: { id: '12345', name: 'Lukas Frito' } }),
                    ],
                    exportOptions: buildOptions({
                        overrides: {
                            includeCompleted: true,
                        },
                    }),
                })

                const rows = result.split('\n')

                expect(rows[1]).toEqual(
                    toCustomCSV(
                        '10000001,My awesome task,1234,,false,2022-08-09,1,This is a description,,My awesome section,Lukas Frito (12345),2022-08-05T00:00:00.000Z,label1; label2,2022-08-06T00:00:00.000Z',
                    ),
                )
            })

            it('does not include fields when excluded by options (eg, section and description)', () => {
                const result = convertTasksToCsvString({
                    tasks: [
                        buildTask({
                            overrides: {
                                id: '10000001',
                                content: 'My awesome task',
                                sectionId: '1234',
                                due: {
                                    string: '2022-08-09',
                                    isRecurring: false,
                                    date: new Date('2022-08-09').toISOString(),
                                },
                                priority: 4,
                                description: 'This is a description',
                                createdAt: new Date(2022, 7, 5).toISOString(),
                                assigneeId: '12345',
                            },
                        }),
                    ],
                    sections: [],
                    collaborators: [
                        buildCollaborator({ overrides: { id: '12345', name: 'Lukas Frito' } }),
                    ],
                    exportOptions: buildOptions({
                        overrides: {
                            section: false,
                            description: false,
                        },
                    }),
                })

                const rows = result.split('\n')

                expect(rows[1]).toEqual(
                    toCustomCSV(
                        '10000001,My awesome task,1234,,false,2022-08-09,1,,Lukas Frito (12345),2022-08-05T00:00:00.000Z,',
                    ),
                )
            })

            it('sanitises the task content/description', () => {
                const result = convertTasksToCsvString({
                    tasks: [
                        buildTask({
                            overrides: {
                                id: '10000001',
                                content: 'My awesome task\nOn two lines',
                                sectionId: '1234',
                                due: {
                                    string: '2022-08-09',
                                    isRecurring: false,
                                    date: new Date('2022-08-09').toISOString(),
                                },
                                priority: 2,
                                description: 'This is a description\nAlso on two lines',
                                createdAt: new Date(2022, 7, 5).toISOString(),
                                assigneeId: '12345',
                            },
                        }),
                    ],
                    sections: [
                        buildSection({
                            overrides: {
                                id: '1234',
                                name: 'My awesome section',
                            },
                        }),
                    ],
                    collaborators: [
                        buildCollaborator({ overrides: { id: '12345', name: 'Lukas Frito' } }),
                    ],
                    exportOptions: buildOptions(),
                })

                const rows = result.split('\n')

                expect(rows[1]).toEqual(
                    toCustomCSV(
                        '10000001,My awesome task On two lines,1234,,false,2022-08-09,3,This is a description Also on two lines,,My awesome section,Lukas Frito (12345),2022-08-05T00:00:00.000Z,',
                    ),
                )
            })

            it('handles task content with commas correctly', () => {
                const result = convertTasksToCsvString({
                    tasks: [
                        buildTask({
                            overrides: {
                                id: '10000001',
                                content: 'My awesome task, but with a comma',
                                sectionId: '1234',
                                due: {
                                    string: '2022-08-09',
                                    isRecurring: false,
                                    date: new Date('2022-08-09').toISOString(),
                                },
                                priority: 4,
                                description: 'This is a description\nAlso on two lines',
                                createdAt: new Date(2022, 7, 5).toISOString(),
                                assigneeId: '12345',
                            },
                        }),
                    ],
                    sections: [
                        buildSection({
                            overrides: {
                                id: '1234',
                                name: 'My awesome section',
                            },
                        }),
                    ],
                    collaborators: [
                        buildCollaborator({ overrides: { id: '12345', name: 'Lukas Frito' } }),
                    ],
                    exportOptions: buildOptions(),
                })

                const rows = result.split('\n')

                expect(rows[1]).toEqual(
                    '10000001...---...My awesome task, but with a comma...---...1234...---......---...false...---...2022-08-09...---...1...---...This is a description Also on two lines...---......---...My awesome section...---...Lukas Frito (12345)...---...2022-08-05T00:00:00.000Z...---...',
                )
            })
        })
    })

    /**
     * This helper function is purely to convert from standard CSV format. We are using a custom delimiter to make it easier to compare against the actual CSV output.
     * because tasks or descriptions could contain commas and this was messing with the CSV upload.
     *
     * @param csv The csv data with "," as the delimiiter
     * @returns regular CSV data with the custom delimiter
     */
    function toCustomCSV(csv: string) {
        return csv.replaceAll(',', DELIMITER)
    }
})
