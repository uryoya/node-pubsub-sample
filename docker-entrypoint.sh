#!/bin/sh
set -e

# Prismaマイグレーションの実行
echo "Running database migrations..."
npx prisma migrate deploy

# アプリケーションの起動
echo "Starting application..."
exec "$@" 