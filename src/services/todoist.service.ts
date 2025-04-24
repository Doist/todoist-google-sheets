import { Section, TodoistApi, User } from '@doist/todoist-api-typescript'

import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { lastValueFrom } from 'rxjs'

import type { Task } from '../types'

const LIMIT = 100

type SyncDue = {
    date: string
    is_recurring: boolean
    lang: string
    string: string
    timezone?: string | null
}

export type SyncTask = {
    added_by_uid: string
    assigned_by_uid?: string
    checked: boolean
    child_order: number
    collapsed: boolean
    content: string
    added_at: string
    completed_at: string
    description: string
    id: string
    is_deleted: boolean
    labels: string[]
    parent_id?: string | null
    priority: number
    project_id: string
    responsible_uid?: string | null
    section_id: string
    user_id: string
    due?: SyncDue | null

    // not exportable at the moment
    // so hardcoding to null
    deadline: null
    duration: null
}

export type CompletedInfo = {
    item_id?: string
    project_id?: string
    section_id?: string
    completed_items: number
}

type CompletedTasksResponse = {
    total: number
    completed_info: CompletedInfo[]
    has_more: boolean
    next_cursor: string | null
    items: SyncTask[]
}

@Injectable()
export class TodoistService {
    constructor(private readonly httpService: HttpService) {}

    async getProjectTasks(params: { token: string; projectId: string }): Promise<Task[]> {
        const { token, projectId } = params
        const todoistClient = new TodoistApi(token)

        return this.fetchAllPages<Task>((cursor) =>
            todoistClient.getTasks({
                projectId,
                ...(cursor ? { cursor } : {}),
            }),
        )
    }

    async getProjectSections(params: { token: string; projectId: string }): Promise<Section[]> {
        const { token, projectId } = params
        const todoistClient = new TodoistApi(token)

        return this.fetchAllPages<Section>((cursor) =>
            todoistClient.getSections({
                projectId,
                ...(cursor ? { cursor } : {}),
            }),
        )
    }

    async getProjectCollaborators(params: { token: string; projectId: string }): Promise<User[]> {
        const { token, projectId } = params
        const todoistClient = new TodoistApi(token)

        return this.fetchAllPages<User>((cursor) =>
            todoistClient.getProjectCollaborators(projectId, {
                ...(cursor ? { cursor } : {}),
            }),
        )
    }

    private async fetchAllPages<T>(
        fetchFn: (cursor?: string | null) => Promise<{ results: T[]; nextCursor: string | null }>,
    ): Promise<T[]> {
        let allResults: T[] = []
        let nextCursor: string | null | undefined = undefined

        do {
            const response: { results: T[]; nextCursor: string | null } = await fetchFn(nextCursor)

            allResults = [...allResults, ...response.results]
            nextCursor = response.nextCursor
        } while (nextCursor !== null)

        return allResults
    }

    async getCompletedTasks({
        projectId,
        token,
        taskId,
        sectionId,
    }: {
        token: string
        projectId?: string
        taskId?: string
        sectionId?: string
    }): Promise<{ tasks: Task[]; completedInfo: CompletedInfo[] }> {
        try {
            const result = await this.getCompletedTasksInternal({
                token,
                projectId,
                taskId,
                sectionId,
            })

            return {
                tasks: result.items.map((task) => this.getTaskFromQuickAddResponse(task)),
                completedInfo: result.completedInfo,
            }
        } catch (error: unknown) {
            return { tasks: [], completedInfo: [] }
        }
    }

    private async getCompletedTasksInternal({
        projectId,
        token,
        taskId,
        sectionId,
    }: {
        token: string
        projectId?: string
        taskId?: string
        sectionId?: string
    }): Promise<{ items: SyncTask[]; completedInfo: CompletedInfo[] }> {
        const allItems: SyncTask[] = []
        const allCompletedInfo: CompletedInfo[] = []

        const fetchPage = async (
            cursor?: string | null,
        ): Promise<{
            results: SyncTask[]
            nextCursor: string | null
            completedInfo: CompletedInfo[]
        }> => {
            const response = await lastValueFrom(
                this.httpService.get<CompletedTasksResponse>(
                    // this endpoint is not publicly documented.
                    // we should eventually move to one of the Todoist API v1 endpoints
                    // for fetching completed tasks (e.g `/tasks/completed/by_parent`).
                    // we're only using this endpoint because at the moment (April 2025),
                    // the v1 endpoints do not return data for unjoined projects.
                    'https://api.todoist.com/api/v9.223/archive/items',
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            limit: LIMIT,
                            ...(projectId ? { project_id: projectId } : {}),
                            ...(taskId ? { parent_id: taskId } : {}),
                            ...(sectionId ? { section_id: sectionId } : {}),
                            ...(cursor ? { cursor } : {}),
                        },
                    },
                ),
            )

            return {
                results: response.data.items,
                nextCursor: response.data.has_more ? response.data.next_cursor : null,
                completedInfo: response.data.completed_info,
            }
        }

        let nextCursor: string | null | undefined = undefined

        do {
            const pageResult: {
                results: SyncTask[]
                nextCursor: string | null
                completedInfo: CompletedInfo[]
            } = await fetchPage(nextCursor)

            allItems.push(...pageResult.results)
            allCompletedInfo.push(...pageResult.completedInfo)
            nextCursor = pageResult.nextCursor
        } while (nextCursor !== null)

        return {
            items: allItems,
            completedInfo: allCompletedInfo,
        }
    }

    async getCompletedInfo({ token }: { token: string }): Promise<CompletedInfo[]> {
        const response = await lastValueFrom(
            this.httpService.post<{ completed_info: CompletedInfo[] }>(
                'https://api.todoist.com/api/v9.223/sync',
                { resource_types: ['completed_info'] },
                { headers: { Authorization: `Bearer ${token}` } },
            ),
        )

        return response.data.completed_info
    }

    private getTaskFromQuickAddResponse(responseData: SyncTask): Task {
        const due: Task['due'] = responseData.due
            ? {
                  isRecurring: responseData.due.is_recurring,
                  string: responseData.due.string,
                  date: responseData.due.date,
                  ...(responseData.due.timezone !== null && { datetime: responseData.due.date }),
                  ...(responseData.due.timezone !== null && {
                      timezone: responseData.due.timezone,
                  }),
              }
            : null

        return {
            id: responseData.id,
            order: responseData.child_order,
            content: responseData.content,
            description: responseData.description,
            projectId: responseData.project_id,
            sectionId: responseData.section_id,
            isCompleted: responseData.checked,
            labels: responseData.labels,
            priority: responseData.priority,
            createdAt: responseData.added_at,
            creatorId: responseData.added_by_uid,
            parentId: responseData.parent_id ?? null,
            assigneeId: responseData.responsible_uid ?? null,
            assignerId: responseData.assigned_by_uid ?? null,
            completedAt: responseData.completed_at,
            due,
            deadline: responseData.deadline,
            duration: responseData.duration,
        }
    }
}
