<div align="center">

# pstack

**给 AI 编码代理装上资深工程师的工作习惯**

一套 Markdown 规则，逼 AI 在动手前把问题想清楚、动手后拿出运行时证据，而不是写完就说"改好了"。

[安装](#安装) · [使用](#使用) · [工作原理](#工作原理) · [技能清单](#技能清单) · [常见问题](#常见问题)

同时支持 **Claude Code** 和 **Codex** · 44 个技能 · 23 个 playbook · 21 条工程原则

</div>

---

## 为什么用 pstack

AI 写代码的默认失败模式是：看上去合理、跑不起来、或者跑起来了但没人验证过。

| 能力 | 作用 |
|---|---|
| **先理解再动手** | `/how` `/why` 并行开多个子代理探清子系统和设计历史，讲不清完整调用链就不许进入下一步 |
| **接口先于实现** | `/architect` 在跨函数边界前先定类型、签名、模块划分；跳过必须写明理由，不能悄悄混进实现 |
| **多模型对抗** | `/arena` 并行出 N 个方案再择优嫁接，`/interrogate` 让不同模型轮流攻击你的 diff |
| **证据而非断言** | prove-it-works 原则：CI 绿不算证据，agent 自称通过不算证据，只有没写这段代码的人在真实界面跑出来的结果才算 |
| **23 个 playbook** | 每类任务（修 bug、加需求、重构、性能、发版、长任务托管）都定死了步骤、出口条件和验收标准 |
| **21 条工程原则** | 从"先定核心数据结构"到"迁移完调用方就删掉旧 API"，在需要时被自动引用 |
| **不留 AI 味** | `/no-comments` 清废话注释，`/unslop` 去 AI 腔，`/technical-writing` 规范 PR 和 commit |
| **一次安装，两端可用** | 从公共方法论生成两个原生产物；Claude Code 与 Codex 的文件、代理和配置互不影响 |

目标不是让 agent 写得更多，而是写得更少、但每一行都站得住。

---

## 环境要求

- Node.js >= 18
- Claude Code 或 Codex（装了哪个就用哪个，两个都装会自动识别）
- Bun（可选；仅 `babysit` 的完整 PR watcher 和 `orchestrate` 账本 CLI 需要。helper 不会隐式安装依赖）

---

## 安装

```bash
npx pstack add
```

交互式勾选要装哪些技能：`↑↓` 移动，`空格` 勾选，`a` 全选，`回车` 确认。默认预选 10 个核心入口，安装时自动补齐它们引用的运行依赖。

### 其他安装方式

```bash
npx pstack add --core        # 核心入口及其自动展开的运行依赖
npx pstack add --all         # 全装 44 个
npx pstack add how why       # 按名字装指定技能
```

### 管理命令

```bash
npx pstack list              # 看装了什么、装在哪
npx pstack find review       # 按关键词搜技能
npx pstack update            # 重装已安装的（升级用）
npx pstack remove            # 交互式卸载
npx pstack doctor            # 检查两端的安装状态
```

### 安装位置

两个 host 始终安装为**独立副本**。Claude Code 与 Codex 使用各自的调用语法、frontmatter、代理格式和配置路径。修改一边的已安装文件不会影响另一边。

```
~/.agents/skills/how/          ← Codex 技能，使用 $how
~/.codex/agents/*.toml         ← Codex 自定义代理
~/.claude/skills/how/          ← Claude Code 技能，使用 /how
~/.claude/agents/*.md          ← Claude Code 自定义代理
```

| 选项 | 作用 |
|---|---|
| `--host claude` / `codex` / `both` | 只装给指定 agent。默认自动探测本机装了哪些 |
| `--scope user` / `project` | 装到全局 `~/`，还是当前仓库的 `./.claude/`、`./.agents/`。默认 user |
| `--copy` | 显式使用独立副本；当前也是默认且唯一模式 |
| `--dry-run` | 只打印会做什么，不写任何文件 |
| `-y` / `--yes` | 跳过确认 |

### 分发给同事

同事只需要一行：

```bash
npx pstack add --core
```

想固定版本或走内部源，把这个仓库发布到 npm 或私有 registry，之后运行 `npx <你的包名> add`。项目不提供 Claude Code plugin 入口，避免插件加载绕过 host adapter；Claude Code 和 Codex 都只通过 CLI 安装各自的独立产物。

---

## 使用

### 1. 配置模型档位（可选，但建议跑一次）

```text
# Claude Code
/setup-pstack

# Codex
$setup-pstack
```

它探测你这个会话实际能用哪些模型，绑定三个档位：

| 档位 | 用在哪 |
|---|---|
| 快速代码模型 | 机械的、规格明确的改动 |
| 精确执行模型 | 需要一字不差按步骤执行的活 |
| 判断模型 | 文案、设计决策、对抗式评审 |

技能正文只说"用你的判断模型"，具体是谁由这里决定。Claude Code 写入 `~/.claude/pstack-models.md`，Codex 写入 `~/.codex/pstack-models.md`。两边配置互不读取。跳过也能跑，每个技能有自己的档位默认值。

### 2. 日常只用一个入口

```text
# Claude Code
/poteto-mode 这个 PR 有个诡异的 bug。先复现，再修，再验证。

# Codex
$poteto-mode 给设置页加一个导出功能，支持 CSV 和 JSON，并拿出运行时证据。
```

### 3. 它会自己路由

读你的请求 → 匹配 playbook → 把步骤原样抄进 todo list → 按步骤调用其他技能。

Claude Code 的 `/poteto-mode` 保留原生粘性模式。Codex 不伪造该能力；每个新的独立任务显式调用 `$poteto-mode`，长任务使用当前 Codex 会话提供的 goal、wait 或 recurring-monitoring 能力。

### 4. 需要时直接点名

```
/how 我们是怎么取消 run 的？批量取消时有 N+1 查询吗？
/why 这个重试逻辑当初为什么写成指数退避加抖动？
/interrogate 审一下这个 PR。
```

Codex 上把 `/` 换成 `$`，例如 `$poteto-mode`。

---

## 工作原理

### 五段式循环

```
  ① 理解          ② 设计          ③ 构建          ④ 验证          ⑤ 交付
  ────────       ────────       ────────       ────────       ────────
  /how           /architect     写代码          /interrogate   /unslop
  /why           /arena         /tdd           验证技能        /technical-writing
  /recall        /blast-radius  /swarm         真实取证        /no-comments
                                                              开 PR / 合并

       └── 每一步都有出口条件，不满足就不进入下一步 ──┘
```

| 阶段 | 出口条件 |
|---|---|
| ① 理解 | 能不含糊地讲清楚从输入到输出的完整路径 |
| ② 设计 | 接口和数据形状定了，实现只是填空 |
| ③ 构建 | 代码能自解释，不靠注释撑着 |
| ④ 验证 | 拿到运行时证据，不是断言 |
| ⑤ 交付 | 人类要读的地方没有 AI 味 |

### 23 个 playbook

`/poteto-mode` 从这些里选一个匹配的：

| 类别 | playbook |
|---|---|
| **查问题** | `investigation` 只读调研 · `bug-fix` 复现→定位→修→取证 · `perf-issue` 对着 baseline 优化 · `hillclimb` 长期爬一个指标 · `runtime-forensics` 泄漏/空转/闪烁 · `trace-forensics` 分析 profile 文件 |
| **写东西** | `feature` 从数据形状出发的新行为 · `refactoring` 保持行为的结构调整 · `prototype` 一次性原型定决策 · `visual-parity` 两套实现的像素级一致 |
| **交付** | `opening-a-pr` · `babysit` 推 PR 到可合并 · `shipping` 独立验证后成串落地 · `autopilot-full` 每 PR 一个 owner 跑到合并 · `autopilot-stack` 构建 graphite stack 交人审 |
| **长任务** | `autonomous-run` 不停机跑完 · `orchestrate` 多天多 PR 多 agent 常驻协调 · `multi-phase-plan` 跨阶段 · `session-pickup` 接手上个 agent 的活 · `pause-safely` 干净暂停留检查点 |
| **元** | `authoring-a-skill` 写 SKILL.md · `eval` 盲测 prompt 改动的影响 · `worktree-cleanup` 清 worktree 回收磁盘 |

### 举个例子：`feature` playbook 的实际步骤

1. `/how` 摸清要动的子系统
2. `/architect` 并行探索设计——**跳过必须写明理由**，不能把设计决策悄悄折进实现
3. 写并行度检查点：哪些必须串行、哪些能并行、共享状态怎么切
4. 才开始写代码。交给子代理时必须给定文件路径、**先定好的数据结构**、验收标准；你自己 review diff
5. 在对应的真实界面上验证。"不确定"或验错了界面都不算通过
6. 拆成小的、有序的 commit
7. 设计有争议就 `/interrogate` 再发
8. 走 `opening-a-pr`

第 4 步里那句"先定好的数据结构"是重点：用状态机替代散落的 boolean，用表/注册表替代分支，用类型化模型替代重复的形状假设，**在写第一行逻辑之前选定**。这是新需求里最容易埋雷的地方。

---

## 技能清单

| 分类 | 技能 |
|---|---|
| **主入口** | `poteto-mode` |
| **理解** | `how` `why` `recall` `blast-radius` `teach` |
| **设计与构建** | `architect` `arena` `swarm` `tdd` `typescript-best-practices` `figure-it-out` |
| **验证** | `interrogate` `create-verification-skill` `maintain-verification-skill` |
| **写作** | `unslop` `no-comments` `technical-writing` `bro` |
| **元** | `setup-pstack` `automate-me` `reflect` `show-me-your-work` |
| **21 条原则** | `principle-*`，由上面的技能在需要时引用 |

<details>
<summary>展开 21 条原则</summary>

`boundary-discipline` `build-the-lever` `encode-lessons-in-structure` `exhaust-the-design-space` `experience-first` `fix-root-causes` `foundational-thinking` `guard-the-context-window` `laziness-protocol` `make-operations-idempotent` `migrate-callers-then-delete-legacy-apis` `minimize-reader-load` `model-the-domain` `never-block-on-the-human` `outcome-oriented-execution` `prove-it-works` `redesign-from-first-principles` `separate-before-serializing-shared-state` `sequence-verifiable-units` `subtract-before-you-add` `type-system-discipline`

</details>

跑 `npx pstack find` 看带描述的完整列表。

---

## 资源

| 想做什么 | 看哪里 |
|---|---|
| 了解移植时改了什么 | [`adapters/claude-code.md`](./adapters/claude-code.md) · [`adapters/codex.md`](./adapters/codex.md) |
| 跟着原作者走一遍完整任务 | [`docs/guide/`](./docs/guide/README.md) |
| 改技能后做校验 | `node scripts/build.mjs --check` |
| 生成两端的分发目录 | `node scripts/build.mjs` → `dist/` |
| Slack issue 自动三分类 | [`automations/benny/`](./automations/benny/README.md)（需自行接 Slack MCP 和定时 agent） |

---

## 常见问题

<details>
<summary><b>和 CLAUDE.md / AGENTS.md / .cursorrules 有什么区别？</b></summary>

那几个是**常驻**的项目规则，每次会话全量塞进 context，所以只能写短、写笼统（"用 TypeScript"、"测试放 tests/ 下"）。

pstack 是**按需加载**的技能。44 个技能只有描述行常驻，agent 判断相关才把整份读进来。所以每个技能可以写得很细——`feature` playbook 有 8 个步骤和明确的出口条件，`refactoring` 要求先写行为固定装置再动结构，这种密度塞不进一个常驻文件。

两者不冲突：CLAUDE.md 写你这个项目的事实，pstack 写通用的工程方法。

</details>

<details>
<summary><b>只支持 Claude Code 吗？</b></summary>

不是。Claude Code 和 Codex 都支持，装的时候自动探测。

`skills/` 保存公共方法论，构建器生成两个独立 host tree。Claude Code 产物使用 `/skill`、Markdown agents 和 Claude frontmatter；Codex 产物使用 `$skill`、`agents/openai.yaml`、TOML agents 和 Codex 路径。`scripts/build.mjs --check` 会拦住跨 host 泄漏。

想加第三个 host，44 个技能一个都不用动——写一份新 adapter，再在 `scripts/lib.mjs` 的 `HOSTS` 里加一项就行。

</details>

<details>
<summary><b>44 个全装会不会把 context 撑爆？</b></summary>

不会。常驻的只有每个技能的 `description` 那一行，正文按需加载。

Codex 那边有个硬限制：技能索引最多占 context 的 2% 或 8000 字符（取小），超了会先截断长描述。pstack 的描述都控制得比较紧，但如果你还装了别的技能包导致被截断，用 `npx pstack add` 挑一部分装，别 `--all`。

</details>

<details>
<summary><b>和 Trellis 这类框架冲突吗？</b></summary>

分工不同，但有一块会打架。

pstack 是**无状态**的——它管"干一件事的方法和标准"，不记跨会话的项目状态。Trellis 管的是 `.trellis/` 里沉淀的 spec、任务、工作日志，解决"agent 每次从零开始"。

打架的地方是两边都有工作流编排（Trellis 的 plan→implement→verify→finish vs pstack 的 playbook），而且验证标准差很多：Trellis 的 check 跑 lint/type-check/测试，pstack 明确说这些都不算验证。

要组合的话，让 Trellis 管状态、pstack 管方法：把 pstack 的核心规则写进 `.trellis/spec/`，让它的自动注入把标准带进每个任务。

</details>

<details>
<summary><b>会不会把简单任务也搞得很慢？</b></summary>

会有这个风险，所以 `/poteto-mode` 的定位是"需要严谨的任务"，不是所有任务。它匹配不到 playbook 时会退出来，不硬套。

另外有一条 `laziness-protocol` 原则专门管这个：能达到目标的最小改动才发版，"可能有用"的推测性清理要 revert 掉。

真嫌重就别用 `/poteto-mode`，单独点名 `/how` 或 `/interrogate` 就行。

</details>

<details>
<summary><b>怎么改成我们团队自己的？</b></summary>

公共方法论在 `skills/`，host 差异在 `adapters/claude-code/` 与 `adapters/codex/`。修改后运行 `node scripts/build.mjs --check`，再分别 `npx pstack update --host claude` 和 `npx pstack update --host codex`。已安装目录不会互相同步。

改完跑 `node scripts/build.mjs --check`，它会检查 frontmatter 合法性、目录名冲突、相对链接可达、以及有没有写死模型名或某个 host 的工具名。

想让 agent 按你个人的工作习惯办事，用 `/automate-me`——它会翻你的历史会话，把你实际的工作方式起草成一个专属的 `-mode` 技能。

</details>

<details>
<summary><b>移植时改了哪些东西？</b></summary>

- Cursor 的 `readonly` 模式会剥掉 MCP 访问，Claude Code 的 `Explore` 子代理不会——保留 MCP 但去掉写文件能力。所以 `why` 和 `reflect` 里"请你别改文件"的口头约定改成了由 harness 强制。
- 依赖 `cursor-team-kit` 的技能（`deslop`、`control-ui`、`control-cli`）换成了自带的 `/unslop` 和 `/create-verification-skill` 生成的项目本地验证技能。
- 删掉 `grokbot/make-bot-ui`，它绑死在 Cursor 的 automation webhook 上，两个目标 host 都没有对应物。
- 上游写死的模型 slug 全部换成三档语义，具体绑定交给 `/setup-pstack`。

完整映射见 [`adapters/`](./adapters/)。

</details>

---

## 上游与许可

Fork 自 [cursor/plugins/pstack](https://github.com/cursor/plugins/tree/main/pstack)，作者 Lauren Tan（[@poteto](https://x.com/poteto)，React 核心团队，前 Meta / Netflix / Cursor）。原作者的[使用指南](./docs/guide/README.md)一并保留（内容仍以 Cursor 为背景，方法论完全通用）。

MIT License。改进和 PR 都欢迎。
