#!/usr/bin/env bash

source ~/CRISP/backend/.env.development

set -o pipefail

app_id=${GITHUB_APP_ID}
pem_content=${GITHUB_APP_PRIVATE_KEY}

# Save PEM content to a temporary file
pem_file=$(mktemp)
echo -e -n "${pem_content}" > "${pem_file}"

now=$(date +%s)
iat=$((${now} - 60)) # Issues 60 seconds in the past
exp=$((${now} + 600)) # Expires 10 minutes in the future

b64enc() { openssl base64 | tr -d '=' | tr '/+' '_-' | tr -d '\n'; }

header_json='{
    "typ":"JWT",
    "alg":"RS256"
}'
# Header encode
header=$( echo -n "${header_json}" | b64enc )

payload_json='{
    "iat":'"${iat}"',
    "exp":'"${exp}"',
    "iss":'"${app_id}"'
}'
# Payload encode
payload=$( echo -n "${payload_json}" | b64enc )

# Signature
header_payload="${header}"."${payload}"
signature=$( 
    openssl dgst -sha256 -sign "${pem_file}" \
    <(echo -n "${header_payload}") | b64enc 
)

# Create JWT
JWT="${header_payload}"."${signature}"
printf '%s\n' "JWT: $JWT"

# Clean up the temporary file
rm "${pem_file}"