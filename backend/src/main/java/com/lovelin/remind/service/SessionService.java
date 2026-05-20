package com.lovelin.remind.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 简易 session 管理：token ↔ openid 映射
 * 生产环境应换为 Redis + 过期策略，个人小程序够用
 */
@Service
public class SessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionService.class);
    private static final long SESSION_TTL_MS = 7L * 24 * 60 * 60 * 1000;

    /** token → openid */
    private final Map<String, String> tokenStore = new ConcurrentHashMap<>();
    /** token → 过期时间戳(ms) */
    private final Map<String, Long> tokenExpireAt = new ConcurrentHashMap<>();

    /** openid → token（一个 openid 只保留最新 token） */
    private final Map<String, String> openidIndex = new ConcurrentHashMap<>();

    /**
     * 创建 session，返回 token
     */
    public String createSession(String openid) {
        cleanupExpiredSessions();

        // 清除旧 token
        String oldToken = openidIndex.get(openid);
        if (oldToken != null) {
            tokenStore.remove(oldToken);
            tokenExpireAt.remove(oldToken);
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        tokenStore.put(token, openid);
        tokenExpireAt.put(token, System.currentTimeMillis() + SESSION_TTL_MS);
        openidIndex.put(openid, token);
        return token;
    }

    /**
     * 通过 token 获取 openid，无效返回 null
     */
    public String getOpenid(String token) {
        if (token == null || token.isEmpty()) return null;
        Long expireAt = tokenExpireAt.get(token);
        if (expireAt == null || expireAt <= System.currentTimeMillis()) {
            String openid = tokenStore.remove(token);
            tokenExpireAt.remove(token);
            if (openid != null) {
                openidIndex.remove(openid, token);
            }
            return null;
        }
        return tokenStore.get(token);
    }

    private void cleanupExpiredSessions() {
        long now = System.currentTimeMillis();
        Iterator<Map.Entry<String, Long>> it = tokenExpireAt.entrySet().iterator();
        int removed = 0;
        while (it.hasNext()) {
            Map.Entry<String, Long> entry = it.next();
            if (entry.getValue() <= now) {
                String token = entry.getKey();
                it.remove();
                String openid = tokenStore.remove(token);
                if (openid != null) {
                    openidIndex.remove(openid, token);
                }
                removed++;
            }
        }
        if (removed > 0) {
            log.info("清理过期 session: {}", removed);
        }
    }
}
