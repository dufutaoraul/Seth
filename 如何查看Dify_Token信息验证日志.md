# 如何查看 Dify Token 信息验证日志

## 目的
验证你的 Dify API 是否返回 Token 使用统计信息（usage/metadata）

---

## 📋 操作步骤

### 步骤 1：等待 Vercel 部署完成（1-2分钟）

1. 访问：https://vercel.com/dashboard
2. 找到你的项目：`Seth`
3. 等待绿色的 ✅ 图标（表示部署成功）

---

### 步骤 2：在网站上发送一条测试消息

1. 访问：https://seth-blush.vercel.app
2. 登录你的账号
3. 进入聊天页面
4. **发送一条简单的测试消息**，例如：
   ```
   你好
   ```
5. 等待 AI 回复（正常对话即可）

---

### 步骤 3：查看 Vercel 实时日志

#### 方法 A：通过 Vercel Dashboard（推荐）

1. 打开：https://vercel.com/dashboard
2. 点击你的项目 `Seth`
3. 点击顶部导航栏的 **Logs** 标签
4. 看到日志列表后，找到最近的 `/api/chat-simple` 请求
5. 点击展开日志详情

#### 方法 B：实时查看日志（更快）

1. 在 Vercel Dashboard 的项目页面
2. 点击最新的 Deployment（最上面那个）
3. 点击右上角的 **View Function Logs**
4. 页面会实时显示日志流

---

### 步骤 4：在日志中查找关键信息

在日志中搜索（Ctrl+F）以下关键词：

#### 🔍 关键词 1：`完整Dify API响应`

应该能看到类似这样的输出：

```
========================================
🔍 完整Dify API响应:
{
  "event": "message",
  "conversation_id": "xxx-xxx-xxx",
  "message_id": "xxx-xxx-xxx",
  "answer": "你好！有什么我可以帮助你的吗？",
  "created_at": 1234567890,
  "metadata": {                    ⬅️ 关键：看这里！
    "usage": {                     ⬅️ 关键：看这里！
      "prompt_tokens": 150,
      "completion_tokens": 80,
      "total_tokens": 230
    }
  }
}
========================================
```

#### ✅ 关键词 2：检查是否有这些标记

- `✅ 发现 metadata 字段` → **有 Token 信息！**
- `✅ 发现 usage 字段` → **有 Token 信息！**
- `✅ 发现 metadata.usage 字段` → **有 Token 信息！**
- `❌ 未发现任何Token统计信息` → **没有 Token 信息**

---

## 📊 验证结果判断

### 结果 A：✅ 发现 Token 信息

**日志显示**：
```
✅ 发现 metadata.usage 字段: {
  "prompt_tokens": 150,
  "completion_tokens": 80,
  "total_tokens": 230
}
```

**结论**：
- 🎉 **太好了！Dify 返回了完整的 Token 统计信息**
- 可以实现 **精确的 Token 统计**
- 推荐使用 **方案 A：基于 Token 的智能限制**

**下一步**：
- 实现精确 Token 统计
- 设置阈值：80K 警告，100K 限制
- 对应约 **100-150 轮对话**

---

### 结果 B：❌ 未发现 Token 信息

**日志显示**：
```
❌ 未发现任何Token统计信息
```

**结论**：
- Dify 没有返回 Token 统计
- 需要使用 **方案 C：混合方案（回合数 + Token估算）**

**下一步**：
- 实现客户端 Token 估算
- 结合回合数限制
- 设置阈值：100 轮警告，150 轮限制

---

## 🐛 常见问题

### Q1：找不到日志怎么办？

**解决方法**：
1. 确认 Vercel 部署成功（绿色✅）
2. 确认你发送了测试消息
3. 在 Vercel Logs 页面刷新
4. 选择正确的 Environment（Production）
5. 选择正确的时间范围（Last 1 hour）

### Q2：日志太多找不到关键信息怎么办？

**解决方法**：
1. 使用浏览器搜索功能（Ctrl+F）
2. 搜索：`完整Dify API响应`
3. 或者搜索：`========`（分隔符）
4. 或者搜索：`🔍`（emoji标记）

### Q3：部署失败怎么办？

**解决方法**：
1. 检查 Vercel Dashboard 的部署日志
2. 查看是否有编译错误
3. 如果有错误，联系我帮你解决

### Q4：看不到完整的 JSON 响应怎么办？

**解决方法**：
1. 在 Vercel Logs 页面点击展开日志
2. 复制日志内容到文本编辑器
3. 或者截图发给我看

---

## 📸 截图示例

### 示例 1：有 Token 信息的响应（理想情况）

```json
{
  "conversation_id": "abc-123",
  "message_id": "msg-456",
  "answer": "你好！",
  "metadata": {
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 80,
      "total_tokens": 230
    }
  }
}
```

### 示例 2：没有 Token 信息的响应

```json
{
  "conversation_id": "abc-123",
  "message_id": "msg-456",
  "answer": "你好！",
  "created_at": 1234567890
}
```

---

## ✅ 验证完成后

**请把日志结果告诉我**：

1. 如果看到 `✅ 发现 metadata.usage 字段` → 告诉我 "有Token信息"
2. 如果看到 `❌ 未发现任何Token统计信息` → 告诉我 "没有Token信息"
3. 或者直接把日志截图发给我

**我会根据验证结果**：
- 有 Token 信息 → 实现精确 Token 统计
- 没有 Token 信息 → 实现混合方案（回合数 + 估算）

---

## 📞 需要帮助？

如果遇到任何问题，可以：
1. 截图发给我
2. 复制日志内容发给我
3. 告诉我具体的问题

---

**最后更新时间**：2025-11-04
