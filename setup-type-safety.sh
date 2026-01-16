#!/bin/bash

# Type Safety Setup - Quick Start
# Run this script to install and configure type safety tools

echo "🚀 Setting up TypeScript Type Safety..."
echo ""

# Step 1: Install dependencies
echo "📦 Installing Husky and Lint-Staged..."
cd client || exit
npm install --save-dev husky@^9.0.11 lint-staged@^15.2.0

# Step 2: Initialize Husky
echo ""
echo "🔧 Initializing Husky..."
npm run prepare

# Step 3: Create pre-commit hook
echo ""
echo "📝 Creating pre-commit hook..."
mkdir -p .husky
cat > .husky/pre-commit << 'EOF'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

cd client && npm run type-check && npx lint-staged
EOF

chmod +x .husky/pre-commit
echo "✅ Pre-commit hook created and made executable"

# Step 4: Test type checking
echo ""
echo "🧪 Testing TypeScript type check..."
if npm run type-check; then
    echo "✅ No TypeScript errors found!"
else
    echo "❌ TypeScript errors detected. Please fix them before committing."
    exit 1
fi

# Step 5: Summary
echo ""
echo "================================================"
echo "✨ Type Safety Setup Complete!"
echo "================================================"
echo ""
echo "What's configured:"
echo "  ✅ Type-safe API wrapper (apiFetch)"
echo "  ✅ Extended type definitions"
echo "  ✅ Pre-commit hooks with type checking"
echo "  ✅ Lint-staged for changed files only"
echo ""
echo "Next steps:"
echo "  1. Read TYPE_SAFETY_SETUP.md for detailed docs"
echo "  2. Test: Make a commit to trigger hooks"
echo "  3. Verify: Run 'npm run type-check' anytime"
echo ""
echo "🎉 Happy coding with type safety!"
echo ""

cd ..
