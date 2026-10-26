#!/usr/bin/env bash
# 提交并推送本项目到 GitHub 仓库
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
REMOTE_URL="git@github.com:Kkkwd15/-.git"
BRANCH="main"
KEY="$REPO_ROOT/.github-ssh/id_ed25519_github"
MESSAGE="${1:-更新课堂实践页面}"

cd "$REPO_ROOT"

if [ -f "$KEY" ]; then
    export GIT_SSH_COMMAND="ssh -i $KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new"
fi

if [ ! -d .git ]; then
    git init -q -b "$BRANCH"
fi

if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$REMOTE_URL"
else
    git remote add origin "$REMOTE_URL"
fi

git add -A

if git diff --cached --quiet; then
    echo "没有需要提交的改动"
else
    git commit -q -m "$MESSAGE"
fi

git push -u origin "$BRANCH"

echo "=== 最新提交 ==="
git log --oneline -1
