#!/bin/bash
# Prisma Migration Deployment Script
# This script safely deploys database migrations to production

set -e  # Exit on error

echo "🚀 Starting Prisma migration deployment..."

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} DATABASE_URL is configured"

# Test database connectivity
echo "🔍 Testing database connection..."
if ! npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Cannot connect to database${NC}"
    echo "Please check your DATABASE_URL and network connectivity"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database connection successful"

# Check migration status
echo "📊 Checking migration status..."
npx prisma migrate status

# Confirm deployment
if [ "$CI" != "true" ]; then
    echo -e "${YELLOW}⚠️  This will deploy migrations to the database${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Migration deployment cancelled"
        exit 0
    fi
fi

# Deploy migrations
echo "🔄 Deploying migrations..."
if npx prisma migrate deploy; then
    echo -e "${GREEN}✅ Migrations deployed successfully${NC}"
else
    echo -e "${RED}❌ ERROR: Migration deployment failed${NC}"
    exit 1
fi

# Generate Prisma Client
echo "⚙️  Generating Prisma Client..."
if npx prisma generate; then
    echo -e "${GREEN}✅ Prisma Client generated successfully${NC}"
else
    echo -e "${RED}❌ ERROR: Prisma Client generation failed${NC}"
    exit 1
fi

# Final status check
echo "📊 Final migration status:"
npx prisma migrate status

echo -e "${GREEN}✅ Migration deployment complete!${NC}"
