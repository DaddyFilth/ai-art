# CodeQL SARIF File Upload Fix

## Problem
The CodeQL workflow fails with the error:
```
Code Scanning could not process the submitted SARIF file:
CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled
```

## Root Cause
The repository has **default CodeQL setup** enabled in GitHub's Security settings, which conflicts with the advanced configuration defined in `.github/workflows/codeql-analysis.yml` and `.github/codeql-config.yml`.

GitHub does not allow both configurations to be active simultaneously:
- **Default Setup**: Simple, one-click configuration managed by GitHub
- **Advanced Setup**: Custom workflow with configuration file (what we're using)

## Solution

### Step 1: Disable Default CodeQL Setup
1. Go to https://github.com/DaddyFilth/ai-art/settings/security_analysis
2. Under "Code scanning" section, find "CodeQL analysis"
3. Click "Configure" or "Edit" next to CodeQL analysis
4. Select "Advanced" setup option (or disable default setup if that's an option)
5. Save the changes

### Step 2: Verify Workflow Configuration
The workflow file has been updated to use CodeQL action v4 with proper configuration:
- ✅ Uses `github/codeql-action/init@v4`
- ✅ Uses `github/codeql-action/analyze@v4`
- ✅ Includes Node.js 20 setup with npm caching
- ✅ References custom config file at `.github/codeql-config.yml`
- ✅ Uses advanced query suites (security-extended and security-and-quality)

### Step 3: Test the Fix
After disabling default setup:
1. Trigger the workflow (push to branch or create PR)
2. Check that the workflow runs successfully
3. Verify SARIF results are uploaded to GitHub Security

## Why This Happens
GitHub introduced "default setup" for CodeQL as an easier way to enable code scanning. However, repositories with existing advanced configurations (custom workflow files) will encounter this conflict until the default setup is disabled.

## Technical Details

### Workflow Changes Made
- Upgraded from `@v3` to `@v4` for better SARIF handling
- Added Node.js setup for dependency resolution
- Added cache-dependency-path for efficient caching

### Config File
The `.github/codeql-config.yml` file defines:
- Security-extended and security-and-quality query suites
- Path inclusions (frontend/src, backend/src, backend/prisma)
- Path exclusions (node_modules, dist, tests, etc.)

## Reference
- GitHub Docs: https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/configuring-code-scanning
- CodeQL Action: https://github.com/github/codeql-action
