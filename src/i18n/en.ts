export enum Sheets {
    EXPORT_BUTTON = 'Export',
    EXPORT_COMPLETED = 'Export completed',
    HELP_CENTER_LINK = 'https://get.todoist.help/hc/requests/new?subject=Export%20to%20Google%20Sheets',
    LEARN_MORE_LINK = 'https://todoist.com/help/TBD',
    LOGIN_INSTRUCTIONS = "Export your project's tasks straight to Google Sheets",
    LOGIN_SUCCESSFUL = 'Successfully logged into Google',
    LOGIN_TITLE = 'Log in with Google',
    MAIN_TITLE = 'Export **{0}**', // {0} is the project name
    NO_TASKS = '**{0}** has no tasks to export', // {0} is the project name
    OPTIONS_HEADER = 'Choose which fields you want to export',
    PROFILE_DETAILS_WITH_NAME = 'You’re connected to Google as **{0}** ({1}).',
    PROFILE_DETAILS_WITH_NO_NAME = 'You’re connected to Google as **{0}**.',
    SHEET_TITLE = 'Todoist Export: {0} from {1}', // {0} is the project name, {1} is the date
    VIEW_SHEET = 'View sheet',
}

export enum Options {
    COMPLETED = 'Is completed',
    DUE = 'Due date',
    PRIORITY = 'Priority',
    DESCRIPTION = 'Description',
    PARENT_TASK = 'Parent task',
    SECTION = 'Section',
    ASSIGNEE = 'Assignee',
    CREATED_DATE = 'Created date',
}
