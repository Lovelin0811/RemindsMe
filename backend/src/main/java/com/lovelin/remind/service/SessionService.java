package com.lovelin.remind.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

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

    /** token → openid */
    private final Map<String, String> tokenStore = new ConcurrentHashMap<>();

    /** openid → token（一个 openid 只保留最新 token） */
    private final Map<String, String> openidIndex = new ConcurrentHashMap<>();

    /**
     * 创建 session，返回 token
     */
    public String createSession(String openid) {
        // 清除旧 token
        String oldToken = openidIndex.get(openid);
        if (oldToken != null) {
            tokenStore.remove(oldToken);
        }

        String token = UUID.randomUUID().toString().replace("-", "");
        tokenStore.put(token, openid);
        openidIndex.put(openid, token);
        return token;
    }

    /**
     * 通过 token 获取 openid，无效返回 null
     */
    public String getOpenid(String token) {
        if (token == null || token.isEmpty()) return null;
        return tokenStore.get(token);
    }
}
