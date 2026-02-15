#!/bin/sh

set -e

message="Error starting container. Missing one environment variables.

You must specify CLIENT_ID to a non-empty value.
For example, \"-e CLIENT_ID=clientid\" on \"docker run\"."

auto_config() {
  local config_file="${CONFIG_FILE:-./public/local/api/config.json}"
  local output_file="${OUTPUT_FILE:-./temp.json}"

  defined_envs=$(printf '${%s} ' $(env | cut -d= -f1))

  ## Checking for the presence of required variables
  [ -z "$CLIENT_ID" ] && echo "$message" && exit 1

  # Replace values in file with values from variables
  jq --arg client_id "$CLIENT_ID" \
    '.auth.params.client_id = $client_id' \
    public/local/api/config.json > "$output_file"
  # Delete temporary file
  cat "$output_file" > "$config_file" && rm "$output_file"
}

create_env_file() {
  echo "Creating .env file with environment variables..."
  
  # Create .env file with all relevant environment variables
  cat > .env << EOF
# Environment variables for Next.js application
# Generated at container startup

# Required variables
CLIENT_ID=${CLIENT_ID}
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# OpenReplay configuration
COMPANY_OPENREPLAY_KEY=${COMPANY_OPENREPLAY_KEY}
COMPANY_OPENREPLAY_URL=${COMPANY_OPENREPLAY_URL}

# External service URLs
COMPANY_POWERBI_URL=${COMPANY_POWERBI_URL}
SUPPORT_URL=${SUPPORT_URL}
RESTORE_PASSWORD_URL=${RESTORE_PASSWORD_URL}
EOF

  echo ".env file created successfully"
  echo "Environment variables loaded:"
  echo "  - CLIENT_ID: ${CLIENT_ID}"
  echo "  - ENCRYPTION_KEY: ${ENCRYPTION_KEY}"
  echo "  - COMPANY_OPENREPLAY_KEY: ${COMPANY_OPENREPLAY_KEY}"
  echo "  - COMPANY_OPENREPLAY_URL: ${COMPANY_OPENREPLAY_URL}"
  echo "  - COMPANY_POWERBI_URL: ${COMPANY_POWERBI_URL}"
  echo "  - SUPPORT_URL: ${SUPPORT_URL}"
  echo "  - RESTORE_PASSWORD_URL: ${RESTORE_PASSWORD_URL}"
}

auto_config
create_env_file

exec "$@"
