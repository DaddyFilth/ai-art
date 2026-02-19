# GitHub Workflows and Configuration

This directory contains configuration files for GitHub Actions workflows and code scanning features.

## Workflows

### CI/CD Build and Test (`workflows/ci.yml`)

Automated continuous integration workflow that builds and tests the AI Art Revenue Exchange platform on every push and pull request.

**Jobs:**
- **Backend Build & Test**: Installs dependencies, generates Prisma client, lints, builds, and tests the NestJS backend
- **Frontend Build & Test**: Installs dependencies, lints, type-checks, and builds the Next.js frontend
- **Docker Build**: Verifies Docker images can be built for both backend and frontend

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Manual workflow dispatch

### Security Scanning

- **Codacy Security Scan** (`workflows/codacy.yml`): Automated code quality and security analysis
- **CodeQL Security Analysis** (`workflows/codeql-analysis.yml`): GitHub's built-in security vulnerability scanning

## CodeQL Configuration

**Note:** The CodeQL workflow has been upgraded to use `github/codeql-action@v4` (February 2026). Version 3 will be deprecated in December 2026. The v4 action provides improved performance, enhanced security analysis, and runs on Node.js 24.

The `codeql-config.yml` file provides custom configuration for CodeQL security scanning of the AI Art Revenue Exchange platform.

### Configuration Highlights

- **Query Suites**: Enables `security-extended` and `security-and-quality` suites for comprehensive coverage
- **Scan Paths**: Focuses on source code directories (`frontend/src`, `backend/src`, `backend/prisma`)
- **Exclusions**: Skips scanning of dependencies, build artifacts, and test files
- **Languages**: Automatically detects JavaScript and TypeScript

### Using This Configuration

#### For Dynamic Workflows

If your repository uses GitHub's dynamic code scanning workflow, you can reference this configuration by:

1. Navigate to your repository's Security settings
2. Go to "Code security and analysis"
3. Under "Code scanning", configure the CodeQL analysis
4. Reference this configuration file: `.github/codeql-config.yml`

#### For Static Workflows

If you're using a custom workflow file (`.github/workflows/codeql-analysis.yml`), add the following to your `init` step:

```yaml
- name: Initialize CodeQL
  uses: github/codeql-action/init@v4
  with:
    languages: javascript-typescript
    config-file: ./.github/codeql-config.yml
```

### Configuration Details

**Included Paths:**
- `frontend/src` - Next.js frontend source code
- `backend/src` - NestJS backend source code
- `backend/prisma` - Database schema and configurations

**Excluded Paths:**
- Node modules and dependencies
- Build outputs (`dist`, `build`, `.next`)
- Test files and directories
- Documentation and legal files
- Third-party resources

**Query Suites:**
- `security-extended` - Extended security queries for deeper analysis
- `security-and-quality` - Combined security and code quality checks

### Customization

To customize the CodeQL configuration for your specific needs:

1. Edit `.github/codeql-config.yml`
2. Add or remove paths as needed
3. Enable/disable specific queries using `query-filters`
4. Add custom query packs if you have organization-specific queries

### Best Practices

1. **Keep exclusions up-to-date**: Ensure build artifacts and dependencies are excluded
2. **Review results regularly**: Check CodeQL scan results and adjust query filters for false positives
3. **Use security-extended**: Provides the most comprehensive security coverage
4. **Test configuration changes**: Verify that configuration changes work as expected

### Documentation

For more information about CodeQL configuration:
- [GitHub CodeQL Documentation](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors)
- [CodeQL Query Suites](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/built-in-codeql-query-suites)
- [Customizing Code Scanning](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/customizing-code-scanning)

### Support

For issues related to code scanning configuration:
- Review the [Security Policy](../SECURITY.md)
- Check CodeQL workflow logs in the Actions tab
- Contact the security team: security@aiartexchange.com
