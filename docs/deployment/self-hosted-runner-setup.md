# Self-Hosted Runner Setup Guide

## Overview

This guide explains the hybrid approach implemented for using your self-hosted GitHub Actions runner alongside GitHub-hosted runners for optimal performance and security.

## Current Configuration

### **Hybrid Runner Strategy**

| Job | Runner Type | Reason |
|-----|-------------|--------|
| **lint-and-typecheck** | `self-hosted` | Fast linting and type checking |
| **test** | `self-hosted` | Faster test execution with Node.js matrix |
| **security** | `ubuntu-latest` | **Security isolation on GitHub-hosted** |
| **build** | `self-hosted` | Faster builds with better resources |
| **quality-gates** | `self-hosted` | Final checks and bundle analysis |
| **versioning** | `self-hosted` | Simple git operations |
| **deployment** | `self-hosted` | Notification and version tracking |

## Benefits of This Approach

### **Performance Benefits**
- ⚡ **Faster Builds**: Your local machine likely has more CPU/RAM than GitHub's standard runners
- 🚀 **Reduced Queue Times**: No waiting for GitHub-hosted runners to become available
- 💾 **Better Caching**: Persistent cache between runs on your local machine
- 🔄 **Parallel Execution**: Multiple jobs can run simultaneously on your machine

### **Cost Benefits**
- 💰 **No GitHub Actions Minutes**: Self-hosted jobs don't consume your GitHub Actions quota
- 📊 **Unlimited Usage**: No monthly limits on self-hosted runner usage

### **Security Benefits**
- 🔒 **Security Isolation**: Critical security scans still run on GitHub-hosted runners
- 🛡️ **Controlled Environment**: You maintain full control over the runner environment

## Self-Hosted Runner Requirements

### **Minimum System Requirements**
- **OS**: Windows 10/11 (based on your setup)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 50GB free space for builds and cache
- **CPU**: 4 cores minimum, 8 cores recommended

### **Required Software**
- **Node.js**: Versions 18.x and 20.x
- **Git**: Latest version
- **PowerShell**: For Windows compatibility
- **Build Tools**: Visual Studio Build Tools (for native dependencies)

## Setup Instructions

### **1. Install Required Software**

```powershell
# Install Node.js 18.x and 20.x using Node Version Manager (nvm-windows)
# Download from: https://github.com/coreybutler/nvm-windows

# Install Node.js 18.x
nvm install 18.20.4
nvm use 18.20.4

# Install Node.js 20.x
nvm install 20.11.1
nvm use 20.11.1

# Install Git (if not already installed)
winget install Git.Git

# Install Visual Studio Build Tools (for native dependencies)
winget install Microsoft.VisualStudio.2022.BuildTools
```

### **2. Configure Runner Environment**

```powershell
# Set up npm cache location for better performance
npm config set cache "C:\npm-cache" --global

# Set up environment variables
[Environment]::SetEnvironmentVariable("NODE_OPTIONS", "--max-old-space-size=4096", "Machine")
[Environment]::SetEnvironmentVariable("CI", "true", "Machine")
```

### **3. Runner Maintenance Script**

Create a maintenance script to keep your runner optimized:

```powershell
# Create runner-maintenance.ps1
@"
# GitHub Actions Runner Maintenance Script

Write-Host "🧹 Cleaning up GitHub Actions runner..."

# Clean up old workflow runs (keep last 10)
Get-ChildItem -Path "C:\action-runners\_work" -Directory | 
    Sort-Object CreationTime -Descending | 
    Select-Object -Skip 10 | 
    Remove-Item -Recurse -Force

# Clean up npm cache if it gets too large (>5GB)
$npmCacheSize = (Get-ChildItem -Path "C:\npm-cache" -Recurse | Measure-Object -Property Length -Sum).Sum / 1GB
if ($npmCacheSize -gt 5) {
    Write-Host "📦 NPM cache is $([math]::Round($npmCacheSize, 2))GB, cleaning up..."
    npm cache clean --force
}

# Clean up temp files
Get-ChildItem -Path $env:TEMP -Name "github-actions*" -Directory | 
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "✅ Runner maintenance completed!"
"@ | Out-File -FilePath "C:\action-runners\runner-maintenance.ps1" -Encoding UTF8
```

### **4. Scheduled Maintenance**

Set up a Windows Task Scheduler task to run maintenance weekly:

```powershell
# Create scheduled task for weekly maintenance
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\action-runners\runner-maintenance.ps1"
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At 2AM
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -TaskName "GitHub Actions Runner Maintenance"
```

## Monitoring and Troubleshooting

### **Runner Status Monitoring**

Create a simple monitoring script:

```powershell
# Create runner-status.ps1
@"
# GitHub Actions Runner Status Check

Write-Host "🔍 Checking GitHub Actions runner status..."

# Check if runner service is running
$runnerService = Get-Service -Name "actions.runner.*" -ErrorAction SilentlyContinue
if ($runnerService) {
    Write-Host "✅ Runner service status: $($runnerService.Status)"
} else {
    Write-Host "❌ Runner service not found"
}

# Check disk space
$disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
$freeSpaceGB = [math]::Round($disk.FreeSpace / 1GB, 2)
$totalSpaceGB = [math]::Round($disk.Size / 1GB, 2)

Write-Host "💾 Disk space: $freeSpaceGB GB free of $totalSpaceGB GB total"

if ($freeSpaceGB -lt 10) {
    Write-Host "⚠️  Warning: Less than 10GB free space remaining"
}

# Check Node.js versions
Write-Host "📦 Node.js versions:"
node --version
npm --version

# Check recent workflow runs
$workflowRuns = Get-ChildItem -Path "C:\action-runners\_work" -Directory | 
    Sort-Object CreationTime -Descending | 
    Select-Object -First 5

Write-Host "📋 Recent workflow runs:"
$workflowRuns | ForEach-Object {
    Write-Host "  - $($_.Name) ($($_.CreationTime.ToString('yyyy-MM-dd HH:mm')))"
}
"@ | Out-File -FilePath "C:\action-runners\runner-status.ps1" -Encoding UTF8
```

### **Common Issues and Solutions**

#### **Issue: Runner Not Picking Up Jobs**
```powershell
# Restart the runner service
Restart-Service -Name "actions.runner.*"

# Or restart the runner manually
cd C:\action-runners
.\run.cmd
```

#### **Issue: Out of Disk Space**
```powershell
# Clean up old workflow runs
Get-ChildItem -Path "C:\action-runners\_work" -Directory | 
    Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-7) } | 
    Remove-Item -Recurse -Force

# Clean npm cache
npm cache clean --force
```

#### **Issue: Node.js Version Conflicts**
```powershell
# Use nvm to switch Node.js versions
nvm use 20.11.1  # For most jobs
nvm use 18.20.4  # For Node.js 18.x matrix jobs
```

## Security Considerations

### **Runner Security Best Practices**
1. **Keep Runner Updated**: Regularly update the runner software
2. **Monitor Access**: Only trusted repositories should use the runner
3. **Network Security**: Use firewall rules to restrict runner network access
4. **Regular Maintenance**: Clean up old builds and temporary files
5. **Backup Configuration**: Keep runner configuration backed up

### **Environment Isolation**
- The runner has access to your local environment
- Keep sensitive data out of the runner directory
- Use GitHub Secrets for sensitive information
- Regularly audit runner logs

## Performance Optimization

### **Cache Optimization**
```powershell
# Set up persistent npm cache
npm config set cache "C:\npm-cache" --global

# Set up build cache directory
[Environment]::SetEnvironmentVariable("BUILD_CACHE_DIR", "C:\build-cache", "Machine")
```

### **Resource Monitoring**
```powershell
# Monitor CPU and memory usage during builds
Get-Process -Name "node" | Select-Object ProcessName, CPU, WorkingSet
```

## Expected Performance Improvements

With your self-hosted runner, you should see:

- **Build Time**: 30-50% faster builds
- **Test Execution**: 40-60% faster test runs
- **Queue Time**: Near-zero queue time for self-hosted jobs
- **Cache Performance**: 70-80% faster dependency installation

## Rollback Plan

If you need to revert to GitHub-hosted runners:

1. **Update workflow files**: Change `runs-on: self-hosted` back to `runs-on: ubuntu-latest`
2. **Remove runner**: Stop and remove the self-hosted runner service
3. **Clean up**: Remove the runner directory and configuration

## Files Modified

- ✅ `.github/workflows/ci.yml` - Updated to use hybrid runner strategy
- ✅ `.github/workflows/versioning.yml` - Updated to use self-hosted runner
- ✅ `.github/workflows/deploy.yml` - Updated to use self-hosted runner
- ✅ `docs/deployment/self-hosted-runner-setup.md` - This setup guide

## Next Steps

1. **Verify Runner Status**: Ensure your self-hosted runner is online and healthy
2. **Test Workflows**: Create a test PR to verify the hybrid approach works
3. **Monitor Performance**: Track build times and resource usage
4. **Set Up Maintenance**: Implement the maintenance scripts and scheduled tasks
5. **Document Issues**: Keep track of any issues and their solutions

Your CI/CD pipeline is now optimized for both performance and security! 🚀
