# Pipedrive Data Synchronization

This project synchronizes person data from `inputData.json` with Pipedrive.

The field mapping is defined in `mappings.json`, so the synchronization logic does not depend on hardcoded input field names. Before creating a person, the application checks whether a person with the mapped name already exists in Pipedrive. If the person exists, the existing record is updated. Otherwise, a new person is created.

## How It Works

The synchronization follows these steps:

1. Read the person data from `inputData.json`.
2. Read the field mappings from `mappings.json`.
3. Resolve the mapped input values, including nested fields.
4. Build the Pipedrive request payload.
5. Find the mapping associated with Pipedrive's `name` field.
6. Search Pipedrive for an existing person using that name.
7. If the person exists, update the existing record.
8. If the person does not exist, create a new record.
9. Return the synchronized Pipedrive person.

## Project Structure

    pd-sync-assginment/
    ├── src/
    │   ├── index.ts
    │   ├── mappings/
    │   │   ├── inputData.json
    │   │   └── mappings.json
    │   └── types/
    │       └── pipedrive.ts
    ├── .gitignore
    ├── package.json
    ├── pnpm-lock.yaml
    └── tsconfig.json

### Main Files

- `src/index.ts` - Contains the synchronization logic.
- `src/mappings/inputData.json` - Contains the input person data.
- `src/mappings/mappings.json` - Defines the mapping between input fields and Pipedrive fields.
- `src/types/pipedrive.ts` - Contains TypeScript interfaces for Pipedrive data.

## Prerequisites

Before running the project locally, make sure you have:

- Node.js 18 or later
- npm or pnpm
- A Pipedrive account
- A Pipedrive API token

## Local Setup

### 1. Clone the Repository

    git clone <your-repository-url>
    cd pd-sync-assginment

### 2. Install Dependencies

Using npm:

    npm install

Or using pnpm:

    pnpm install

### 3. Create the Environment File

Create a `.env` file in the root of the project.

Add the following variables:

    PIPEDRIVE_API_KEY=your_pipedrive_api_token
    PIPEDRIVE_COMPANY_DOMAIN=your_company_domain

### Getting the Pipedrive API Token

Generate or obtain an API token from your Pipedrive account and add it to:

    PIPEDRIVE_API_KEY=your_pipedrive_api_token

The API token should never be committed to the repository.

### Getting the Company Domain

The company domain is the part before `.pipedrive.com` in your Pipedrive URL.

For example, if your Pipedrive URL is:

    https://pallav-sandbox.pipedrive.com

then use:

    PIPEDRIVE_COMPANY_DOMAIN=pallav-sandbox

Do not include `https://` or `.pipedrive.com`.

## Field Mapping

The synchronization uses `src/mappings/mappings.json` to determine how fields from the input data should be mapped to Pipedrive.

The current mapping is:

    [
      {
        "pipedriveKey": "name",
        "inputKey": "fullName"
      },
      {
        "pipedriveKey": "email",
        "inputKey": "emailAdress"
      },
      {
        "pipedriveKey": "phone",
        "inputKey": "phoneNumber.home"
      }
    ]

The input data contains:

    {
      "fullName": "Jason",
      "emailAdress": "Jason@email.com",
      "phoneNumber": {
        "home": "123-456-7890",
        "work": "098-765-4321"
      }
    }

### Mapping Note

The phone mapping was adjusted to:

    phoneNumber.home

instead of:

    phone.home

because the provided `inputData.json` stores the phone number under `phoneNumber.home`.

The implementation supports dot-separated nested paths. Therefore:

    phoneNumber.home

is resolved dynamically as:

    inputData.phoneNumber.home

This keeps the mapping consistent with the provided input structure rather than hardcoding the field in the synchronization logic.

## Pipedrive Payload

The mappings are converted into the structure expected by the Pipedrive API.

For the provided input, the resulting payload is:

    {
      "name": "Jason",
      "emails": [
        {
          "value": "Jason@email.com",
          "primary": true
        }
      ],
      "phones": [
        {
          "value": "123-456-7890",
          "primary": true
        }
      ]
    }

The `email` and `phone` mappings are converted to Pipedrive's `emails` and `phones` array format.

## Synchronization Logic

### Existing Person

The application first searches Pipedrive using the value mapped to the `name` field.

If a matching person is found, the existing person is updated using:

    PATCH /api/v2/persons/{id}

This prevents duplicate people from being created.

### New Person

If no matching person is found, a new person is created using:

    POST /api/v2/persons

## Running the Application

After completing the environment setup, run:

    npm run dev

Or with pnpm:

    pnpm dev

The application will perform the synchronization and print the result in the terminal.

## Verifying the Result

After running the application:

1. Open your Pipedrive account.
2. Go to Contacts → People.
3. Search for the person from `inputData.json`.
4. Open the person record.
5. Verify the mapped name, email, and phone.

Running the synchronization again with the same name should update the existing person instead of creating another record.

## Edge Cases Handled

### 1. Missing Name Mapping

The application requires a mapping for Pipedrive's `name` field because the name is used to find an existing person.

If the mapping is missing, the synchronization stops with a descriptive error.

### 2. Missing Input Field

If a mapped input field does not exist, the application skips that field instead of sending `undefined` or `null` to Pipedrive.

For example, if:

    phoneNumber.mobile

is mapped but `mobile` does not exist in the input data, the phone field is skipped.

### 3. Pipedrive API Errors

API responses are checked before processing the response.

If Pipedrive returns an error, the application reports the HTTP status and response body so that the failure can be diagnosed instead of being silently ignored.

## Testing

The following scenarios were tested:

### Existing Person

A person already present in Pipedrive is found by name and updated.

### New Person

When no matching person exists, a new Pipedrive person is created.

### Missing Input Field

A missing nested field is skipped without causing the synchronization to fail.

### API Error

Pipedrive API failures are caught and reported with a meaningful error message.

## Security

Environment variables are used for Pipedrive credentials.

The `.env` file should not be committed to GitHub.

The `.gitignore` file should include:

    node_modules/
    .env

Never expose or commit the Pipedrive API token.

## Technologies Used

- TypeScript
- Node.js
- Pipedrive REST API
- dotenv
- JSON-based field mapping
