# Type Safety Setup - Quick Start
# Run this script to install and configure type safety tools

Write-Host "🚀 Setting up TypeScript Type Safety..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies
Write-Host "📦 Installing Husky and Lint-Staged..." -ForegroundColor Yellow
Set-Location -Path "client"
npm install --save-dev husky@^9.0.11 lint-staged@^15.2.0

# Step 2: Initialize Husky
Write-Host ""
Write-Host "🔧 Initializing Husky..." -ForegroundColor Yellow
npm run prepare

# Step 3: Create pre-commit hook
Write-Host ""
Write-Host "📝 Creating pre-commit hook..." -ForegroundColor Yellow
$hookContent = @"
#!/usr/bin/env sh
. "`$(dirname -- "`$0")/_/husky.sh"

cd client && npm run type-check && npx lint-staged
"@

$hookPath = ".husky\pre-commit"
Set-Content -Path $hookPath -Value $hookContent
Write-Host "✅ Pre-commit hook created: $hookPath" -ForegroundColor Green

# Step 4: Test type checking
Write-Host ""
Write-Host "🧪 Testing TypeScript type check..." -ForegroundColor Yellow
npm run type-check

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ No TypeScript errors found!" -ForegroundColor Green
} else {
    Write-Host "❌ TypeScript errors detected. Please fix them before committing." -ForegroundColor Red
    exit 1
}

# Step 5: Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✨ Type Safety Setup Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "What's configured:" -ForegroundColor Yellow
Write-Host "  ✅ Type-safe API wrapper (apiFetch)" -ForegroundColor White
Write-Host "  ✅ Extended type definitions" -ForegroundColor White
Write-Host "  ✅ Pre-commit hooks with type checking" -ForegroundColor White
Write-Host "  ✅ Lint-staged for changed files only" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Read TYPE_SAFETY_SETUP.md for detailed docs" -ForegroundColor White
Write-Host "  2. Test: Make a commit to trigger hooks" -ForegroundColor White
Write-Host "  3. Verify: Run 'npm run type-check' anytime" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Happy coding with type safety!" -ForegroundColor Green
Write-Host ""

Set-Location -Path ".."
