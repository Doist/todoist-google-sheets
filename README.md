# Todoist: Export to Google Sheets

UI Extension for Todoist that exports projects to Google Sheets

## Running it All

After you pull the code, do the following actions to start the backend component:

1. Copy `example.env` to `.env` and ensure the values have been filled in correctly (see below)
2. `npm install`
3. `npm run start:dev`

This should yield a backend running at `http://localhost:3000`

## Local environment variables

To tailor your dev environment, create a `.env` file and put in the relevant settings:

-   `PORT`: The port the backend will run on
-   `BASE_URL`: This is the domain for accessing static files (like images)
-   `VERIFICATION_TOKENS`: This is the comma-separated list of valid tokens the integration will require to validate when it's called.
-   `DB_HOST`: Database host
-   `DB_PORT`: Database port
-   `DB_USERNAME`: Database username
-   `DB_PASSWORD`: Database password
-   `DB_ENCRYPTION_KEY`: The db is encrypting sensitive columns, provide the key here.
-   `DB_ENCRYPTION_ALGORITHM`: The algorithm used for the encryption.
-   `DB_ENCRYPTION_IV_LENGTH`: The length of the initialization vector used by the encryption.

### Database

In order to run the database locally, please run `npm run database:run` and this will create a mysql docker container (if one doesn't already exist).

### Migrations

If the database model changes, you need to create a new migration.

First, install ts-node globally:

`npm install -g ts-node`

You can then run `npm run migration:create ./src/migrations/<name>` (name should be the migration name you want to give it, don't include spaces).
This will create an empty migration in the `migrations` folder. You can go ahead and edit it there. The migrations are run at app start (this is set up via the Typeorm module in app.module.ts)

There's also the option to let typeorm generate the migration for you automatically. In this case,
you need to run `npm run migration:generate ./src/migrations/<name>` (name should be the migration name you want to give it, don't include spaces).
For more information, visit https://typeorm.io/#/migrations

### Google App developer account setup

1. Create a new Google app (click the dropdown next to the page title, then choose New Project) [link](https://console.cloud.google.com/apis/dashboard)
2. Give the project a name, then click `Create`
3. Once created, select that app, then click on `Enable APIs and Services`
4. Search for "Sheets" then click on the Google Sheets API result, then Enable it
5. Go back to the [dashboard](https://console.cloud.google.com/apis/dashboard) and click on `OAuth consent screen` down the left hand side
6. Choose `External`, then click `Create`.
7. Fill in the app details, if running locally, provide your ngrok link in the authorized domains, click `Save and continue`
8. Click `Add or remove scopes`, the scopes you need are `/auth/userinfo.profile`, `/auth/userinfo.email`, and `auth/spreadsheets`. Click `Save and continue`
9. Click `Add Users` and add your email address (and any others that may need access). Click `Save and Continue`, then `Back to dashboard`
10. On the left hand menu, click `Credentials`
11. Click `Create Credentials`, then API Key, copy the value provided and put it in your .env file
12. Click `Create Credentials` again, then click `OAuth Client Id`.
13. Application type should be "Web application", then fill in the remaining details. _Authorized redirect URIs_ to be `[BASE_URL from .env file]/auth`. Click `Create`

Note _Client ID_ and _Client Secret_ add them to `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## Accessing your extension

You will need to use something like [ngrok](https://ngrok.com/), or [localtunnel](http://localtunnel.github.io/www/), in order for Todoist to be able to access your backend. Whichever service you use, the resulting URL is what should be used in the `BASE_URL` setting. It will also be what you add to your UI Extension in your integration at the [App Console](https://todoist.com/app_console). For this extension it will be `<Your Base URL>/process`.

### Displaying the UI Extension

To display the UI extension:

-   Go to https://todoist.com/app_console
-   Create a new integration
-   Scroll down to the UI Extensions section of that integration and add a new one. This should be of type Context menu. The URL should be a locally running [ngrok](https://ngrok.com/) or [localtunnel](https://www.npmjs.com/package/localtunnel) instance
-   Copy the verification token in the integration and put it in your `.env` file in the `VERIFICATION_TOKENS` field.
-   Start the extension service (`npm run start:dev`) and start ngrok/localtunnel.
-   Go to https://todoist.com
-   Click a context menu of a project, then extensions, then whatever you called your UI extension
