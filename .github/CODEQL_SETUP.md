# CodeQL Setup Guide

## ⚠️ CRITICAL: Resolving CodeQL Configuration Conflict

### The Problem

If you're seeing this error in your CodeQL workflow runs:

```
Error: Code Scanning could not process the submitted SARIF file:
CodeQL analyses from advanced configurations cannot be processed when the default setup is enabled
```

This means **GitHub's default CodeQL setup is enabled** while this repository **also has an advanced CodeQL workflow** (`.github/workflows/codeql-analysis.yml`). These two configurations **cannot coexist**.

### Why This Happens

GitHub provides two ways to set up CodeQL:

1. **Default Setup** (Simple): GitHub automatically configures CodeQL with minimal configuration
2. **Advanced Setup** (Customizable): You create and maintain a custom workflow file with specific configurations

This repository uses **Advanced Setup** with custom configurations in:
- `.github/workflows/codeql-analysis.yml` - The workflow file
- `.github/codeql-config.yml` - Custom query configurations

When both are enabled, GitHub rejects SARIF uploads from the advanced workflow because it expects results from the default setup instead.

### The Solution

A repository administrator **must disable the default CodeQL setup** through GitHub's web interface.

#### Step-by-Step Instructions

1. **Navigate to Repository Settings**
   - Go to your repository on GitHub: `https://github.com/DaddyFilth/ai-art`
   - Click on **Settings** (requires admin access)

2. **Access Code Security Settings**
   - In the left sidebar, click **Code security and analysis**

3. **Disable Default CodeQL Setup**
   - Find the **Code scanning** section
   - Look for **CodeQL analysis**
   - If it shows "Default" or has a "Configure" button showing default setup is enabled:
     - Click **•••** (three dots menu) or the configuration option
     - Select **Disable CodeQL default setup** or **Switch to advanced**
     - Confirm the action

4. **Verify the Change**
   - After disabling, you should see options to set up advanced configuration
   - The advanced workflow in `.github/workflows/codeql-analysis.yml` will now work correctly

5. **Re-run Failed Workflow**
   - Go to the **Actions** tab
   - Find the failed CodeQL workflow run
   - Click **Re-run all jobs**
   - The workflow should now complete successfully

### Visual Guide

```
GitHub Repository → Settings → Code security and analysis
                                        ↓
                            Code scanning section
                                        ↓
                              CodeQL analysis
                                        ↓
                     [Disable default setup button]
```

### Verification

After disabling the default setup, your CodeQL workflow should:
- ✅ Run successfully on pushes and pull requests
- ✅ Upload SARIF files without errors
- ✅ Display code scanning alerts in the Security tab

### Why We Use Advanced Setup

This repository uses advanced setup because it provides:

- **Custom Query Suites**: `security-extended` and `security-and-quality` for comprehensive coverage
- **Path Filtering**: Scans only source code, excludes tests and dependencies
- **Custom Configuration**: Optimized for the AI Art Exchange platform architecture
- **Node.js Setup**: Required for proper JavaScript/TypeScript analysis
- **Scheduled Scans**: Weekly automatic security scans

### Alternative: Keep Default Setup (Not Recommended)

If you prefer to use GitHub's default setup instead of the advanced configuration:

1. Delete or rename `.github/workflows/codeql-analysis.yml`
2. Delete or rename `.github/codeql-config.yml`
3. Enable default setup in Settings → Code security and analysis
4. Accept GitHub's default configuration (less customizable)

**Note**: This is **not recommended** for this repository as the advanced configuration provides better coverage and is optimized for our tech stack.

### Troubleshooting

#### Still Getting the Error?

1. **Verify default setup is disabled**:
   - Check Settings → Code security and analysis
   - Ensure "Default" is not shown for CodeQL analysis

2. **Check for multiple workflow files**:
   ```bash
   find .github/workflows -name "*codeql*.yml"
   ```
   - There should only be one: `codeql-analysis.yml`

3. **Wait for settings to propagate**:
   - GitHub settings changes can take a few minutes to apply
   - Wait 5-10 minutes before re-running workflows

4. **Clear workflow cache**:
   - Go to Actions → Caches
   - Delete any CodeQL-related caches
   - Re-run the workflow

#### Need Help?

- **Check workflow logs**: Actions tab → Failed CodeQL run → View logs
- **Review Security Policy**: See `SECURITY.md` for contact information
- **GitHub Documentation**: [CodeQL Setup Documentation](https://docs.github.com/en/code-security/code-scanning/automatically-scanning-your-code-for-vulnerabilities-and-errors/configuring-code-scanning-for-a-repository)

### For Repository Administrators

This is a **one-time setup issue** that requires admin access to resolve. Once the default setup is disabled, the advanced workflow will work correctly for all future runs.

**Required Permissions**: Repository admin or organization owner

**Action Required**: Disable default CodeQL setup in repository settings

**Impact**: Minimal - switching from default to advanced setup maintains code scanning functionality with better customization

---

**Last Updated**: February 2026  
**Related Files**: 
- `.github/workflows/codeql-analysis.yml`
- `.github/codeql-config.yml`
- `.github/README.md`
