#!/bin/bash
# InteractiveVerseFocus - Secrets Management Script
# Encrypt/decrypt .env files for secure sharing between team members
# Usage: ./scripts/manage-secrets.sh [encrypt|decrypt|setup]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Files
ENV_FILE=".env"
ENCRYPTED_FILE=".env.encrypted"
TEMPLATE_FILE=".env.template"

# Functions
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

show_help() {
    cat << EOF
InteractiveVerseFocus Secrets Management

This script helps maintainers encrypt sensitive .env files for secure sharing
with the development team, while keeping secrets out of the repository.

USAGE:
    ./scripts/manage-secrets.sh [command]

COMMANDS:
    encrypt     Encrypt .env file to .env.encrypted (maintainers only)
    decrypt     Decrypt .env.encrypted to .env (team members)
    setup       Initialize .env from template (first-time setup)
    help        Show this help message

WORKFLOW:
    1. Maintainer configures .env with real secrets
    2. Maintainer runs: ./scripts/manage-secrets.sh encrypt
    3. .env.encrypted is committed to repo (safe to commit)
    4. Team members run: ./scripts/manage-secrets.sh decrypt
    5. .env is created locally with secrets

SECURITY:
    - .env.encrypted contains encrypted secrets (safe to commit)
    - .env contains real secrets (never commit - already in .gitignore)
    - Encryption uses AES-256-CBC with passphrase protection

EOF
}

check_dependencies() {
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL is required but not installed"
        print_info "Install with: brew install openssl (macOS) or apt install openssl (Ubuntu)"
        exit 1
    fi
}

cmd_encrypt() {
    print_info "Encrypting .env file..."

    if [ ! -f "$ENV_FILE" ]; then
        print_error ".env file not found. Configure your secrets first."
        print_info "Run: cp .env.template .env"
        print_info "Then edit .env with your real secret values"
        exit 1
    fi

    # Check if .env has placeholder values
    if grep -q "your-openrouter-api-key\|your-google-oauth-client-id\|your-jwt-secret" "$ENV_FILE"; then
        print_warning "WARNING: .env still contains placeholder values!"
        print_warning "Make sure to replace all placeholder values with real secrets before encrypting."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Encryption cancelled"
            exit 0
        fi
    fi

    # Get passphrase
    read -s -p "Enter encryption passphrase: " PASSPHRASE
    echo
    read -s -p "Confirm passphrase: " PASSPHRASE_CONFIRM
    echo

    if [ "$PASSPHRASE" != "$PASSPHRASE_CONFIRM" ]; then
        print_error "Passphrases don't match"
        exit 1
    fi

    if [ -z "$PASSPHRASE" ]; then
        print_error "Passphrase cannot be empty"
        exit 1
    fi

    # Encrypt file
    echo "$PASSPHRASE" | openssl enc -aes-256-cbc -salt -in "$ENV_FILE" -out "$ENCRYPTED_FILE" -pass stdin

    print_success ".env encrypted to .env.encrypted"
    print_info "You can now safely commit .env.encrypted to the repository"
    print_warning "Remember to share the passphrase securely with team members"
}

cmd_decrypt() {
    print_info "Decrypting .env.encrypted file..."

    if [ ! -f "$ENCRYPTED_FILE" ]; then
        print_error ".env.encrypted file not found"
        print_info "Ask a maintainer to encrypt their .env file first"
        exit 1
    fi

    if [ -f "$ENV_FILE" ]; then
        print_warning ".env already exists!"
        read -p "Overwrite existing .env? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Decryption cancelled"
            exit 0
        fi
    fi

    # Get passphrase
    read -s -p "Enter decryption passphrase: " PASSPHRASE
    echo

    if [ -z "$PASSPHRASE" ]; then
        print_error "Passphrase cannot be empty"
        exit 1
    fi

    # Try to decrypt
    if echo "$PASSPHRASE" | openssl enc -aes-256-cbc -d -salt -in "$ENCRYPTED_FILE" -out "$ENV_FILE" -pass stdin 2>/dev/null; then
        print_success ".env.encrypted decrypted to .env"
        print_info "Your .env file is ready!"
        print_warning "Remember: never commit the .env file"
    else
        print_error "Decryption failed - wrong passphrase or corrupted file"
        exit 1
    fi
}

cmd_setup() {
    print_info "Setting up .env from template..."

    if [ ! -f "$TEMPLATE_FILE" ]; then
        print_error ".env.template not found"
        exit 1
    fi

    if [ -f "$ENV_FILE" ]; then
        print_warning ".env already exists!"
        read -p "Overwrite existing .env? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Setup cancelled"
            exit 0
        fi
    fi

    cp "$TEMPLATE_FILE" "$ENV_FILE"
    print_success ".env created from template"
    print_info "Edit .env with your secret values, then run: ./scripts/manage-secrets.sh encrypt"
}

# Check dependencies
check_dependencies

# Main script
case "${1:-help}" in
    encrypt)
        cmd_encrypt
        ;;
    decrypt)
        cmd_decrypt
        ;;
    setup)
        cmd_setup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac