# CodeQL Setup Guide

## Overview

This repository uses **Advanced CodeQL Configuration** with custom workflows and settings. This provides more control over the analysis but requires proper setup.

## ⚠️ Important: Disable Default Setup

**GitHub's default CodeQL setup MUST be disabled for this advanced configuration to work.**

If you see this error:
```
CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled
```

Follow these steps to fix it:

### How to Disable Default Setup

1. Go to repository **Settings**
2. Navigate to **Security** → **Code security and analysis**
3. Find the **"Code scanning"** section
4. Look for **"CodeQL analysis"**
5. If you see "Default setup is enabled", click **"Disable"**
6. Confirm the action

After disabling, the advanced workflow in `.github/workflows/codeql-analysis.yml` will work properly.

## Configuration Files

### 1. Workflow File: `.github/workflows/codeql-analysis.yml`

This file defines when and how CodeQL analysis runs:
- **Triggers**: Push to main/develop, Pull requests, Weekly schedule, Manual dispatch
- **Language**: JavaScript/TypeScript
- **Actions**: Uses CodeQL v4 actions for initialization and analysis

### 2. Config File: `.github/codeql-config.yml`

This file customizes the CodeQL analysis:
- **Query Suites**: `security-extended` and `security-and-quality`
- **Paths**: Only analyzes `frontend/src`, `backend/src`, and `backend/prisma`
- **Exclusions**: Skips node_modules, dist, build, tests, and other non-source paths

## Benefits of Advanced Configuration

- **Customizable paths**: Focus analysis on source code only
- **Custom query suites**: Run specific security checks
- **Control over scheduling**: Define when analysis runs
- **Path exclusions**: Skip unnecessary directories

## Troubleshooting

### Analysis Fails with "action_required" status

**Cause**: Default setup is still enabled on GitHub

**Solution**: Follow the "How to Disable Default Setup" instructions above

### YAML Syntax Errors

Both configuration files use proper YAML formatting:
- Document starts with `---`
- Consistent indentation (2 spaces)
- Arrays use compact notation: `[item1, item2]`
- Strings are properly quoted where needed

### Workflow Not Running

Check:
1. Default setup is disabled
2. YAML files are valid (no syntax errors)
3. Workflow file is in `.github/workflows/` directory
4. Config file is referenced correctly in the workflow

## Switching to Default Setup

If you prefer GitHub's default setup (simpler but less flexible):

1. Delete `.github/workflows/codeql-analysis.yml`
2. Delete `.github/codeql-config.yml`
3. Go to Settings → Security → Code security and analysis
4. Enable "Default setup" for CodeQL analysis

## Additional Resources

- [GitHub CodeQL Documentation](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/about-code-scanning-with-codeql)
- [CodeQL Configuration Reference](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/configuring-code-scanning)
- [CodeQL Query Suites](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/built-in-codeql-query-suites)
