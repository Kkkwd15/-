---
name: github-commit-push
description: 把当前项目的改动提交并推送到它的 GitHub 仓库。当用户要求提交到 GitHub、commit 并 push、或把本项目同步到 GitHub 时使用。不适用于其他仓库、拉取代码或创建 Pull Request。
---

# 提交到 GitHub

把本项目的改动提交并推送到远程仓库 `git@github.com:Kkkwd15/-.git`（分支 `main`）。

## 环境信息

- 项目根目录：仓库根，技能目录向上四级。
- 远程仓库：`git@github.com:Kkkwd15/-.git`，GitHub 账号 `Kkkwd15`
- 默认分支：`main`
- SSH 私钥：`.github-ssh/id_ed25519_github`（所在目录已在 `.gitignore` 中，绝不提交）
- 提交作者沿用全局 git 配置，不要修改 git config

## 执行方式

直接运行脚本，不要手工逐条敲命令：

```bash
bash .trae/skills/github-commit-push/scripts/push.sh "提交说明"
```

不传参数时使用默认提交说明「更新课堂实践页面」。

脚本依次完成：仓库初始化（若未初始化）、设置 origin、`git add -A`、提交、`git push -u origin main`，最后打印最新一条提交。

## 检查与异常处理

- 确认输出中没有 `.github-ssh/id_ed25519_github`；私钥一旦进入提交必须立即撤回。
- 推送被拒绝（远程有新提交）时，先 `git pull --rebase origin main` 再重试，绝不 force push。
- 用户未明确要求提交时，先确认再执行。
