# bi-coding-challenge

This is one of the Avise, Inc. coding challenges. Fork this repo and follow the Setup and Getting Started instructions
to begin. The goal of this coding challenge is for us to see how you approach solving problems with code. We do not
expect you to "complete" the skeleton code in thus repo. This project is intentionally big to give you plenty of areas
to show off your coding skills... dazzle us :-)

You are allowed, and even encouraged, to use whatever references you would normally use when coding, including AI
assistants.

The tech stack you will use for the front end is:

* Typescript
* React

The tech stack we would like you to use for the back end is:

* Node
* Typescript
* Express
* Postgres
* Prisma ORM
* Mocha

If you are not familiar with Node, Typescript and that ecosystem you are allowed to use Java as an alternative. You must
still build on top of the Postgres DB but any Java framework and ORM you are familiar with is acceptable.

## Setup

## Getting Started

You are building a "Business Intelligence" app which can be used to execute detailed SQL queries against a Postgres
database. It is intended as a tool to help users understand the data present in the DB for the purpose of making
business decisions. Think a "poor man's" Looker. The application will use the standard REST endpoints in the back-end
with a single-page React front-end pattern.

## APPLICATION OVERVIEW

The app is composed of two separate processes: a React frontend and a Typescript Express backend. There is a single .env
file (and a .env.example) that contains all configuration for both processes. The code should load these variables in
each process as needed.

### ENVIRONMENTAL VARIABLES

* GOOGLE_CLIENT_ID: The Google OAuth client ID.
* GOOGLE_CLIENT_SECRET: The Google OAuth client secret.
* GOOGLE_REDIRECT_URI: The OAuth callback URL used by the backend to handle Google Auth responses.
* GOOGLE_SCOPES: The required Google scopes (must include permissions to create and edit Google Sheets).
* USER_WHITELIST: A comma-separated list of authorized email addresses.
* AI_PROVIDER: Either "openai" or "claude" to select which LLM is used.
* POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD: Used by the backend to connect to the
  Postgres database in a read-only manner.
* SESSION_SECRET: Used by the Express backend for session management.
* Any other necessary environment variables for the LLM API credentials (e.g., OPENAI_API_KEY) must be present in .env
  and referenced as needed.
* Other environment variables as needed for deployment, logging, or runtime configuration.

### GENERAL AUTHENTICATION AND SESSION MANAGEMENT

The frontend has a login screen that supports only Google Auth. Upon successful login, the frontend sends the user’s
Google email address to the backend. The backend checks if the email is included in the USER_WHITELIST. If yes, a
session is created and stored in memory in the Express backend. If not, the user is redirected back to the login screen
with an unauthorized error.

The backend must validate that all main endpoints require a valid session. If no session is found, the backend returns a
specific “not logged in” error that the frontend will interpret to redirect the user to the login screen.
Google Auth must request permission to create and edit Google Sheets so that the user’s access token can be used later
to create or update a Google Sheet from the query results.

### FRONTEND SCREENS AND BEHAVIOR

#### Login Screen

* Contains a button for signing in with Google.
* Displays an error message if authentication failed or the user is not in the whitelist. The user can attempt to log in
  with another Google account.

#### Main Screen (visible only if the user is logged in)

* Shows a header containing the user’s email address and a Logout button.
* Shows a heading “Avise Query Tool”.
* Has two columns beneath the heading:
    * Left column: AI chat interface
        * The user can type messages. Press Enter/Return to submit, Shift+Enter/Return to add a new line.
        * Displays the conversation with the AI in a typical chat format.
        * At the bottom of this column is a “clear” button that clears the chat history.
    * Right column: SQL canvas
        * An editable text area with a fixed-width font and full SQL syntax highlighting.
        * Pressing Tab inserts four spaces.
        * At the bottom of this column is a “clear” button that clears the SQL canvas.
        * Below the SQL canvas is a “Run Query” button that submits the current SQL to the backend query runner.

#### Results Section (below both columns)

* Displays query results in a nicely formatted manner.
* If the user chooses a format of csv or json, the results should either be displayed (for json) or
  downloaded/streamed (for csv) as appropriate.
* If the user chooses gsheet, the app should create a new Google Sheet in the user’s Google Drive and populate the sheet
  with the query results. The front end then displays a confirmation or any relevant link or message.

#### Error Handling and Display

* If the backend returns any error, display it in an error section at the top of the page on the main screen. This can
  include unauthorized errors or query issues.
* If the backend indicates the user’s login has expired or is invalid, the frontend redirects to the login screen.

#### Logout

The Logout button ends the session on the backend and redirects the user to the login screen. The frontend should clear
any chat/sql/results state. If the user logs back in, the state is fresh.

### FRONTEND IMPLEMENTATION DETAILS

The React frontend will maintain a chat history state and an SQL canvas state. When the user navigates away or logs out,
this state can be cleared. On a successful login, the state can be restored if desired or reset. The AI Chat interface
calls the chat endpoint with the current conversation and the SQL text from the SQL canvas. It updates the chat and
potentially the canvas with the “replacementSql” from the AI response.

The Run Query button sends the current SQL to the query runner endpoint with the chosen maxResults and format. The
response is displayed in the results section or triggers a file download or sheet creation. Any errors are shown at the
top of the page. If the user is not logged in or the session is invalid, the backend returns an error that the frontend
interprets to redirect to the login screen.

### BACKEND ENDPOINTS

#### AI Chat Endpoint

* Receives a list of the existing chat messages and the current SQL canvas content.
* Delegates to a chat service module, which uses the AI_PROVIDER to call the configured LLM with a system prompt (loaded
  from a separate file) that instructs the LLM to help create or update SQL queries. The chat service appends the
  current SQL to the user’s last message for context.
* The response from the LLM must be valid JSON with two fields:
    * “message” containing text to display in the chat.
    * “replacementSql” containing any updated SQL.
* If the response is not valid JSON in the required format, the backend will ask the LLM to fix it up to a fixed number
  of times. If it still fails, the backend returns an error to the frontend.
* The frontend will display the “message” portion in the chat, and if “replacementSql” is present, it replaces whatever
  is in the SQL canvas.

#### Query Runner Endpoint

* Requires:
    * sql: The SQL string to be executed (read-only).
    * maxResults: Either a number or “all”.
    * format: One of “json”, “csv”, or “gsheet”.
* If maxResults is a number, use a regex to insert a LIMIT clause. The actual numeric value must be bound as a parameter
  to prevent SQL injection. If maxResults is “all,” no limit is inserted.
* The data service module handles the actual Postgres connection. It must be configured read-only.
* If the format is “json” or “csv,” stream the results in the corresponding format so that the entire dataset does not
  have to be held in memory.
* If the format is “gsheet,” use the user’s Google auth token to create a new sheet in the user’s Google Drive, then
  stream the query results into that sheet. If the token is invalid or expired, return an error that causes the frontend
  to prompt the user to re-log in.
* Return query results in the requested format. Errors are returned with an appropriate status code and error message.

### SESSION VALIDATION:

Both the AI Chat Endpoint and the Query Runner Endpoint must verify the user session. If invalid, return an appropriate
error that triggers the frontend to redirect to the login screen.

### OTHER BACKEND REQUIREMENTS:

Use an in-memory session store (e.g., express-session with a memory store) for simplicity. The session secret is
configured via the SESSION_SECRET environment variable. The system prompt for the LLM must be stored in its own file
that is read by the chat service module. Logging must use Winston. All requests to the backend should be logged at an
appropriate level. Any errors or exceptions should also be logged with Winston.

### FOLDER STRUCTURE (HIGH-LEVEL, NO OPTIONS):

* A "backend" folder for the Typescript Express application (controllers, services, middlewares, session handling, LLM
  interface, data service).
* A "frontend" folder for the React application (components for Login, Main, Chat, SQLCanvas, Results, etc.).
* A .env file in the root (and a .env.example) containing all variables required by both backend and frontend.
* A separate file for the LLM system prompt in the backend.
