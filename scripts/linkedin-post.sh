#!/usr/bin/env bash
# LinkedIn Post Script - Posts markdown content to LinkedIn via API
#
# Usage:
#   ./linkedin-post.sh <file.md> [--dry-run] [--visibility PUBLIC|CONNECTIONS] [--json]
#   ./linkedin-post.sh --help
#
# Environment:
#   LINKEDIN_ACCESS_TOKEN  - OAuth access token (required)
#   LINKEDIN_PERSON_URN    - urn:li:person:<id> (required)
#
# Exit codes:
#   0 - Success
#   1 - User error (invalid args, file not found, missing env)
#   2 - API error (auth, rate limit, service error)

set -euo pipefail

# Defaults
DRY_RUN=false
VISIBILITY="PUBLIC"
JSON_OUTPUT=false
FILE_PATH=""

# Colors (disabled in JSON mode or non-interactive)
if [[ -t 1 ]] && [[ "${JSON_OUTPUT:-false}" != "true" ]]; then
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[1;33m'
    NC='\033[0m' # No Color
else
    GREEN=''
    RED=''
    YELLOW=''
    NC=''
fi

usage() {
    cat << 'EOF'
LinkedIn Post Script - Posts markdown content to LinkedIn via API

USAGE:
    ./linkedin-post.sh <file.md> [options]
    ./linkedin-post.sh --help

ARGUMENTS:
    <file.md>              Path to markdown file with YAML frontmatter

OPTIONS:
    --dry-run, -n          Simulate without posting to LinkedIn
    --visibility, -v <vis> PUBLIC or CONNECTIONS (default: PUBLIC)
    --json, -j             Output as JSON (for CI parsing)
    --help, -h             Show this help message

ENVIRONMENT:
    LINKEDIN_ACCESS_TOKEN  OAuth access token (required)
    LINKEDIN_PERSON_URN    urn:li:person:<id> (required)

EXAMPLES:
    # Post from file (dry run)
    ./scripts/linkedin-post.sh genAI/linkedin-7day/day1.md --dry-run

    # Post with JSON output for CI
    ./scripts/linkedin-post.sh genAI/linkedin-7day/day1.md --json

    # Post to connections only
    ./scripts/linkedin-post.sh genAI/linkedin-7day/day1.md --visibility CONNECTIONS

EXIT CODES:
    0 - Success
    1 - User error (invalid args, file not found, missing env)
    2 - API error (auth, rate limit, service error)
EOF
}

log_error() {
    if [[ "$JSON_OUTPUT" == "true" ]]; then
        echo "{\"success\":false,\"error\":\"$1\"}"
    else
        echo -e "${RED}Error:${NC} $1" >&2
    fi
}

log_success() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${GREEN}Success:${NC} $1"
    fi
}

log_info() {
    if [[ "$JSON_OUTPUT" != "true" ]]; then
        echo -e "${YELLOW}Info:${NC} $1"
    fi
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                usage
                exit 0
                ;;
            --dry-run|-n)
                DRY_RUN=true
                shift
                ;;
            --visibility|-v)
                if [[ -z "${2:-}" ]]; then
                    log_error "--visibility requires an argument (PUBLIC or CONNECTIONS)"
                    exit 1
                fi
                VISIBILITY="${2^^}" # Uppercase
                if [[ "$VISIBILITY" != "PUBLIC" && "$VISIBILITY" != "CONNECTIONS" ]]; then
                    log_error "Invalid visibility: $VISIBILITY (must be PUBLIC or CONNECTIONS)"
                    exit 1
                fi
                shift 2
                ;;
            --json|-j)
                JSON_OUTPUT=true
                # Disable colors when JSON output is enabled
                GREEN=''
                RED=''
                YELLOW=''
                NC=''
                shift
                ;;
            -*)
                log_error "Unknown option: $1"
                exit 1
                ;;
            *)
                if [[ -z "$FILE_PATH" ]]; then
                    FILE_PATH="$1"
                else
                    log_error "Unexpected argument: $1"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$FILE_PATH" ]]; then
        log_error "File path is required"
        usage
        exit 1
    fi
}

# Validate environment variables
validate_env() {
    if [[ -z "${LINKEDIN_ACCESS_TOKEN:-}" ]]; then
        log_error "LINKEDIN_ACCESS_TOKEN environment variable is not set"
        exit 1
    fi

    if [[ -z "${LINKEDIN_PERSON_URN:-}" ]]; then
        log_error "LINKEDIN_PERSON_URN environment variable is not set"
        exit 1
    fi
}

# Parse markdown file - strip YAML frontmatter and return content
# YAML frontmatter is delimited by --- at the start of the file
parse_markdown() {
    local file="$1"

    if [[ ! -f "$file" ]]; then
        log_error "File not found: $file"
        exit 1
    fi

    # Check if file starts with ---
    local first_line
    first_line=$(head -n 1 "$file")

    if [[ "$first_line" != "---" ]]; then
        # No frontmatter, return entire content
        cat "$file"
        return
    fi

    # Strip YAML frontmatter: remove everything between first --- and second ---
    # Use awk to skip from line 1 (---) to the next --- and print the rest
    awk '
        BEGIN { in_frontmatter = 0; found_end = 0 }
        NR == 1 && /^---$/ { in_frontmatter = 1; next }
        in_frontmatter && /^---$/ { in_frontmatter = 0; found_end = 1; next }
        !in_frontmatter && found_end { print }
    ' "$file" | sed '/./,$!d' # Remove leading blank lines
}

# Build LinkedIn API payload as JSON
build_payload() {
    local content="$1"
    local visibility="$2"
    local person_urn="$3"

    # Use jq to properly escape the content string
    jq -n \
        --arg author "$person_urn" \
        --arg commentary "$content" \
        --arg visibility "$visibility" \
        '{
            author: $author,
            commentary: $commentary,
            visibility: $visibility,
            distribution: {
                feedDistribution: "MAIN_FEED",
                targetEntities: [],
                thirdPartyDistributionChannels: []
            },
            lifecycleState: "PUBLISHED",
            isReshareDisabledByAuthor: false
        }'
}

# Post to LinkedIn API
post_to_linkedin() {
    local payload="$1"
    local access_token="$2"

    # Create temp file for response headers
    local header_file
    header_file=$(mktemp)
    trap "rm -f '$header_file'" EXIT

    # Make API request
    local http_code
    local response

    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer $access_token" \
        -H "Content-Type: application/json" \
        -H "LinkedIn-Version: 202401" \
        -H "X-Restli-Protocol-Version: 2.0.0" \
        -D "$header_file" \
        -d "$payload" \
        "https://api.linkedin.com/v2/posts")

    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n 1)
    # Remove the status code from response body
    response=$(echo "$response" | sed '$d')

    # Check for success (201 Created)
    if [[ "$http_code" == "201" ]]; then
        # Extract post ID from X-RestLi-Id header
        local post_id
        post_id=$(grep -i "x-restli-id:" "$header_file" | sed 's/.*: //' | tr -d '\r\n' || echo "unknown")

        echo "$post_id"
        return 0
    else
        # Return error info
        echo "HTTP_ERROR:$http_code:$response"
        return 1
    fi
}

# Map HTTP error to user-friendly message
map_error() {
    local http_code="$1"
    local response="$2"

    case "$http_code" in
        401)
            echo "LINKEDIN_AUTH_EXPIRED|Access token expired or invalid"
            ;;
        429)
            echo "LINKEDIN_QUOTA_EXCEEDED|Rate limit exceeded (150 posts/day max)"
            ;;
        422)
            echo "LINKEDIN_CONTENT_REJECTED|Content rejected by LinkedIn"
            ;;
        502|503)
            echo "LINKEDIN_SERVICE_ERROR|LinkedIn API unavailable"
            ;;
        *)
            echo "INTERNAL_ERROR|HTTP $http_code: $response"
            ;;
    esac
}

# Main execution
main() {
    parse_args "$@"
    validate_env

    # Parse markdown content
    local content
    content=$(parse_markdown "$FILE_PATH")

    if [[ -z "$content" ]]; then
        log_error "No content found in file: $FILE_PATH"
        exit 1
    fi

    local char_count=${#content}

    # Build payload
    local payload
    payload=$(build_payload "$content" "$VISIBILITY" "$LINKEDIN_PERSON_URN")

    # Dry run mode
    if [[ "$DRY_RUN" == "true" ]]; then
        local post_id="dry-run-$(date +%s)"

        if [[ "$JSON_OUTPUT" == "true" ]]; then
            jq -n \
                --arg postId "$post_id" \
                --arg file "$FILE_PATH" \
                --arg visibility "$VISIBILITY" \
                --argjson charCount "$char_count" \
                '{
                    success: true,
                    postId: $postId,
                    dryRun: true,
                    metadata: {
                        file: $file,
                        characterCount: $charCount,
                        visibility: $visibility
                    }
                }'
        else
            log_info "DRY RUN - Would post to LinkedIn:"
            echo "  File: $FILE_PATH"
            echo "  Characters: $char_count"
            echo "  Visibility: $VISIBILITY"
            echo "  Post ID: $post_id"
            echo ""
            echo "Content preview (first 200 chars):"
            echo "${content:0:200}..."
        fi
        exit 0
    fi

    # Actual post
    log_info "Posting to LinkedIn..."

    local result
    if result=$(post_to_linkedin "$payload" "$LINKEDIN_ACCESS_TOKEN"); then
        # Success
        local post_id="$result"

        if [[ "$JSON_OUTPUT" == "true" ]]; then
            jq -n \
                --arg postId "$post_id" \
                --arg file "$FILE_PATH" \
                --arg visibility "$VISIBILITY" \
                --argjson charCount "$char_count" \
                '{
                    success: true,
                    postId: $postId,
                    dryRun: false,
                    metadata: {
                        file: $file,
                        characterCount: $charCount,
                        visibility: $visibility
                    }
                }'
        else
            log_success "Posted to LinkedIn!"
            echo "  Post ID: $post_id"
            echo "  Characters: $char_count"
            echo "  Visibility: $VISIBILITY"
        fi
        exit 0
    else
        # Parse error
        local error_info="$result"
        local http_code
        local response

        # Parse HTTP_ERROR:code:response format
        http_code=$(echo "$error_info" | cut -d: -f2)
        response=$(echo "$error_info" | cut -d: -f3-)

        local error_mapped
        error_mapped=$(map_error "$http_code" "$response")
        local error_code
        local error_message
        error_code=$(echo "$error_mapped" | cut -d'|' -f1)
        error_message=$(echo "$error_mapped" | cut -d'|' -f2)

        if [[ "$JSON_OUTPUT" == "true" ]]; then
            jq -n \
                --arg code "$error_code" \
                --arg message "$error_message" \
                --arg rawResponse "$response" \
                '{
                    success: false,
                    error: $message,
                    code: $code,
                    rawResponse: $rawResponse
                }'
        else
            log_error "LinkedIn API Error: $error_message"
            echo "  Error Code: $error_code" >&2
            if [[ -n "$response" ]]; then
                echo "  Raw Response: $response" >&2
            fi
        fi
        exit 2
    fi
}

main "$@"
