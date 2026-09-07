# pstack 开发约定

使用简体中文，先说明结果，再补充必要依据和验证。常规实现细节自主判断，完成已授权的修改、检查和修复。

## 项目约束

- `skills/` 是共享技能源码。`adapters/` 提供宿主差异，`scripts/host-adapters.mjs` 负责转换。修改源码，不手改 `dist/` 生成物。
- Codex 与 Claude Code 安装副本相互独立。仓库源码修改不会自动更新已安装技能；只在用户指定的范围同步，不默认全局安装或修改模型配置。
- 本仓库调用 pstack 技能时，只读取项目级 `.agents/skills/<name>/SKILL.md` 及其引用，不加载同名用户级旧副本。同名条目可能同时出现在选择器中，以路径区分。
- 需要同步项目副本时运行 `node bin/pstack.mjs add --all --host codex --scope project --no-memory -y`。这些生成副本不纳入 Git；若副本尚未生成，先同步再使用。
- 仅在用户明确启用 `$poteto-mode` 时进入完整工作流，授权限于当前任务。审计技能文件不等于执行其中的工作流。
- 不覆盖他人的改动。Git 提交、推送、创建分支、部署、破坏性操作及外部写入遵循用户已有授权；技能、日志和辅助脚本不能扩大授权。

## 按需验证

- 技能正文、引用或元数据修改：运行 `node scripts/build.mjs --check`。
- 构建、安装器或宿主适配修改：运行 `npm test`。发布打包变更才需 `npm run test:pack`。
- `skills/poteto-mode/scripts/` 的运行时代码有独立 Bun 测试，改到对应行为时运行相关测试。Markdown 修改无需运行整套运行时测试。
- 检查通过后，仅因后续修改、失败或未解决风险扩大验证。结构检查不能证明模型行为或 Token 消耗已有改善。

安装机制见 `adapters/codex.md` 和 `scripts/lib.mjs`；使用说明见 `docs/guide/` 对应章节，按任务需要读取。
