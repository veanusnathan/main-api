# ICX API

ICX API is a monolith back-end for ICX App

## Pre-requisites

- Docker
- Nvm
- Node.js `v18`

### Windows Users
- `win-node-env` npm package installed globally `npm install -g win-node-env`

### Auto detect Node.js version

To apply the required Node version from `.nvmrc` automatically to your terminal, add this command in your `.bashrc` or `.zshrc`

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" --no-use # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Use Node version from .nvmrc if exist
if [ -f ".nvmrc" ]; then
  nvm use > /dev/null
else
  nvm use default > /dev/null
fi
```

## Installation

```bash
$ yarn install
```

## Running the dependencies

```bash
$ docker-compose up -d
```

## Setup Environment Variables
We have `.env.development` and `.env.test` as the default environment variables for development and test mode. To override the value based on your needs, you can duplicate the file and add `.local` suffix (e.g `.env.development.local`) to the new file.

## Google Service Account
1. Go to Firebase console > Project Settings > Service Accounts
2. Generate new private key
3. Save to src/notification/google-service-account.json

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev
```

## Test

```bash
# unit tests
$ yarn run test

# e2e tests
$ yarn run test:e2e

# test coverage
$ yarn run test:cov
```

## Troubleshooting

### Storage bucket returns not found error
To make sure that the fake GCS server run smoothly, do the CURL request or using Postman based on this [guide](https://github.com/fsouza/fake-gcs-server#running-with-http). If the issue still persist, do these things:
1. Restart the container
2. Create `data` directory inside the root of the project, add a file inside the directory, and recreate the container.

Useful guides:
- https://github.com/fsouza/fake-gcs-server/issues/636#issuecomment-1145200449
