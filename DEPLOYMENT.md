# GitHub Pages 部署指南

## 已完成配置

✅ **GitHub Actions Workflow** (`.github/workflows/deploy.yml`)
- 自动构建和部署到 GitHub Pages
- 支持推送触发和手动触发
- 使用官方 `actions/deploy-pages` 动作

✅ **Vite 配置更新** (`vite.config.js`)
- 添加了 `base: './'` 配置，确保相对路径正确加载资源

## 部署步骤

### 1. 启用 GitHub Pages

1. 访问你的仓库页面
2. 进入 **Settings** → **Pages**
3. 在 **Source** 部分选择 **GitHub Actions**（不是 Branch）
4. 保存设置

### 2. 触发首次部署

**方式一：推送到 main 分支**
```bash
git add .
git commit -m "feat: 添加 GitHub Pages 部署配置"
git push origin main
```

**方式二：手动触发**
1. 访问仓库的 **Actions** 标签页
2. 找到 "Deploy to GitHub Pages" workflow
3. 点击 "Run workflow" 按钮
4. 选择分支后点击 "Run workflow"

### 3. 查看部署状态

- 在 **Actions** 标签页查看构建和部署进度
- 部署成功后会显示绿色的成功标记
- 部署 URL 会在 Action 日志中显示

### 4. 访问你的网站

部署成功后，你的网站将在以下地址可用：
```
https://<你的 GitHub 用户名>.github.io/<仓库名称>/
```

例如：`https://username.github.io/internet-tycoon-1999/`

## 自动更新

每次你向 `main` 分支推送代码时，GitHub Actions 会自动：
1. 安装依赖
2. 构建项目
3. 部署到 GitHub Pages

通常在 2-5 分钟内完成更新。

## 故障排查

### 构建失败
检查 Action 日志中的错误信息，常见问题：
- 依赖安装失败：检查 `package.json`
- TypeScript 类型错误：运行 `npm run typecheck` 本地验证
- 构建配置问题：检查 `vite.config.js`

### 页面空白或资源加载失败
- 确认 `vite.config.js` 中有 `base: './'` 配置 ✅ 已配置
- 清除浏览器缓存
- 检查浏览器控制台的网络错误

### 404 错误
- 等待几分钟让 CDN 生效
- 确认仓库是公开的（私有仓库需要 GitHub Pro）
- 检查 URL 是否正确（区分大小写）

## 自定义域名（可选）

如果想使用自己的域名：

1. 在仓库的 **Settings** → **Pages** → **Custom domain** 中添加域名
2. 在你的 DNS 提供商处添加 CNAME 记录指向 `<用户名>.github.io`
3. 或者添加 A 记录指向 GitHub Pages 的 IP：
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```

## 注意事项

⚠️ **重要提示：**
- GitHub Pages 是静态网站托管，不支持后端 API
- 每月有 100GB 的带宽限制（对个人项目通常足够）
- 构建产物在 `dist` 目录，不要手动修改该目录
- 如果使用了 Supabase 等外部服务，确保 CORS 配置正确

## 测试本地构建

在推送前可以本地测试构建：
```bash
npm run build
npx vite preview --port 3000
```

这会在本地启动预览服务器，展示生产环境的构建结果。

---

祝部署顺利！🚀
