# RemindsMe

微信小程序提醒应用，包含：

| 模块 | 目录 | 技术栈 |
|---|---|---|
| 后端 API | `backend` | Spring Boot 3.3.4 + MySQL + 定时任务 |
| 小程序 | `miniprogram` | 微信小程序原生框架 |

## 目录结构

| 路径 | 说明 |
|---|---|
| `backend/src/main/java/com/lovelin/remind/controller/RemindController.java` | 提醒相关接口 |
| `backend/src/main/java/com/lovelin/remind/service/ReminderScheduler.java` | 每分钟扫描并推送提醒 |
| `backend/src/main/resources/application.properties` | 后端配置 |
| `miniprogram/utils/api.js` | 小程序 API 基础地址与请求封装 |

## 本地启动（后端）

### 1. 环境要求

| 项目 | 版本建议 |
|---|---|
| JDK | 21 |
| Maven | 3.9+ |
| MySQL | 8.x |

### 2. 初始化数据库

先创建数据库（表会在后端启动时自动创建）：

```sql
CREATE DATABASE IF NOT EXISTS lovelin DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. 配置后端

编辑 `backend/src/main/resources/application.properties`，至少确认这些项：

| 配置项 | 说明 |
|---|---|
| `spring.datasource.url` | MySQL 连接串 |
| `spring.datasource.username` | 数据库用户名 |
| `spring.datasource.password` | 数据库密码 |
| `wx.appid` | 小程序 appid |
| `wx.secret` | 小程序 secret（可用环境变量 `WX_SECRET` 注入） |

### 4. 启动后端

```bash
cd backend
mvn spring-boot:run
```

或打包运行：

```bash
cd backend
mvn clean package -DskipTests
java -jar target/remindme-0.0.1-SNAPSHOT.jar
```

默认监听：`0.0.0.0:3001`

## 小程序联调

### 1. 修改 API 地址

编辑 `miniprogram/utils/api.js`：

```js
const BASE_URL = 'https://lovelin.com.cn/api/remind'
```

本地联调可改为你的本地/测试地址，例如：

```js
const BASE_URL = 'http://127.0.0.1:3001/api/remind'
```

### 2. 微信开发者工具

导入目录：`miniprogram`，然后编译运行。

## 接口清单

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/remind/openid?code=...` | 微信 `code` 换 `openid` |
| POST | `/api/remind/subscribe` | 保存订阅授权 |
| POST | `/api/remind/create` | 创建提醒 |
| GET | `/api/remind/list?openid=...` | 获取提醒列表 |
| POST | `/api/remind/complete` | 标记完成 |
| POST | `/api/remind/delete` | 删除提醒 |
| POST | `/api/remind/test-push` | 手动测试推送 |
| GET | `/health` | 健康检查（由应用提供） |

## 生产部署要点

| 项目 | 建议 |
|---|---|
| 进程管理 | 用 `systemd` 或 `supervisor` 托管 jar |
| 反向代理 | Nginx 代理到 `127.0.0.1:3001` |
| 健康检查 | 探活优先用 `/health` 或 `/api/health`，避免误用无路由路径 |
| 配置安全 | 不要把真实数据库密码和 `wx.secret` 提交到仓库 |

## 常见问题

| 现象 | 排查方向 |
|---|---|
| 域名返回 403 | 先看是否云侧拦截（如阿里云前置层/WAF），再看 Nginx |
| 接口 500 且提示 `No static resource ...` | 请求路径无对应路由，被全局异常包装；检查探活路径和 API 路径 |
| 小程序获取 openid 失败 | 检查 `wx.appid/wx.secret`、回包中的微信错误码 |
