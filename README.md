# RemindsMe

微信小程序提醒应用，支持一次性延迟提醒和定时周期提醒，到时通过微信订阅消息推送。

| 模块 | 目录 | 技术栈 |
|---|---|---|
| 后端 API | `backend` | Java 21 + Spring Boot 3.3.4 + MySQL 8.x |
| 小程序 | `miniprogram` | 微信小程序原生框架 |

## 项目结构

```
├── backend/
│   └── src/main/java/com/lovelin/remind/
│       ├── RemindApplication.java      # 启动类
│       ├── config/ScheduleConfig.java   # 启用定时任务（@EnableScheduling）
│       ├── controller/RemindController.java  # 全部 API 接口
│       └── service/
│           ├── DatabaseInitializer.java     # 建表（启动自动执行）
│           ├── ReminderScheduler.java       # 每分钟扫描到期提醒并推送
│           ├── ReminderService.java         # 增删改查业务逻辑
│           ├── SessionService.java          # Token 鉴权（token ↔ openid 映射）
│           └── WxSubscribeService.java      # 微信订阅消息推送（含 access_token 管理）
└── miniprogram/
    ├── app.js / app.json / app.wxss
    ├── pages/
    │   ├── index/     # 提醒列表（下一个）
    │   ├── add/       # 新建提醒
    │   ├── mine/      # 我的（已完成 / 已推送）
    │   └── privacy/   # 隐私协议
    └── utils/
        ├── api.js     # 统一请求封装 + 登录鉴权
        └── time.js    # 时间格式化工具函数
```

## 鉴权机制

前端通过 `wx.login` 获取 code → 后端 `/openid` 换取 openid 并返回 token → 业务接口携带 token，后端通过 `SessionService` 反查 openid。不信任客户端传的 openid。

```
wx.login() → code → GET /api/remind/openid?code=xxx → token
业务请求 → body: { token, ... } → SessionService.getOpenid(token)
```

## 接口清单

| 方法 | 路径 | 说明 | 鉴权 |
|---|---|---|---|
| GET | `/api/remind/openid?code=...` | 微信 code 换 token | 无 |
| POST | `/api/remind/create` | 创建提醒 | token |
| POST | `/api/remind/list` | 获取提醒列表 | token |
| POST | `/api/remind/complete` | 标记完成 | token |
| POST | `/api/remind/delete` | 删除提醒 | token |

## 本地启动

### 环境要求

| 项目 | 版本 |
|---|---|
| JDK | 21 |
| Maven | 3.9+ |
| MySQL | 8.x |

### 1. 初始化数据库

表会由 `DatabaseInitializer` 自动创建，只需建库：

```sql
CREATE DATABASE IF NOT EXISTS lovelin DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 配置敏感信息

`application.properties` 中密码通过环境变量注入，不提交到仓库：

| 配置项 | 环境变量 | 说明 |
|---|---|---|
| `spring.datasource.password` | `DB_PASSWORD` | 数据库密码 |
| `wx.appid` | `WX_APPID` | 小程序 AppID |
| `wx.secret` | `WX_SECRET` | 小程序 Secret |

### 3. 启动

```bash
cd backend
mvn clean package -DskipTests
java -jar target/remindme-0.0.1-SNAPSHOT.jar
```

默认监听 `0.0.0.0:3001`。

## 小程序联调

修改 `miniprogram/utils/api.js` 中的 `BASE_URL`：

```js
const BASE_URL = 'https://lovelin.com.cn/api/remind'   // 生产
// const BASE_URL = 'http://127.0.0.1:3001/api/remind' // 本地
```

用微信开发者工具导入 `miniprogram` 目录，编译运行。

## 生产部署

| 项目 | 配置 |
|---|---|
| 服务器 | 阿里云 ECS `47.116.214.42` |
| 域名 | `lovelin.com.cn`（HTTPS，ICP 备案） |
| Nginx | `/api/remind` → `127.0.0.1:3001` |
| 进程管理 | systemd `remindme.service` |
| JAR 路径 | `/home/lovelin/remindme/remindme-0.0.1-SNAPSHOT.jar` |
| 敏感配置 | `/home/lovelin/remindme/local.properties`（不提交 git） |

部署流程：Maven 打包 → paramiko SFTP 上传 JAR → `sudo systemctl restart remindme`

## 安全要点

| 项目 | 措施 |
|---|---|
| 鉴权 | 服务端 SessionService token 机制，不信任客户端 openid |
| 敏感信息 | DB 密码 / 微信 secret 通过环境变量注入，不提交 git |
| 日志 | openid 脱敏输出（保留前3后3，中间 `***`） |
| HTTP | RestTemplate 设置连接超时 5s / 读取超时 10s |
| 调度 | Scheduler 全部 try-catch，单条失败不影响整体 |

## 常见问题

| 现象 | 排查方向 |
|---|---|
| 域名返回 403 | 检查阿里云安全组 / WAF 规则，再看 Nginx 配置 |
| 接口 500 `No static resource` | 请求路径无对应路由，检查 API 路径拼写 |
| 小程序获取 openid 失败 | 检查 `WX_APPID` / `WX_SECRET` 环境变量、微信错误码 |
| 订阅消息未推送 | 确认 `@EnableScheduling` 已启用；用户需在 tap 事件中授权一次才有一配额 |
| 提醒列表不显示 | `/list` 返回 `completed` / `pushed` 状态的条目不会出现在"下一个"页面 |
