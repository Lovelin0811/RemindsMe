package com.lovelin.remind.controller;

import com.lovelin.remind.service.ReminderService;
import com.lovelin.remind.service.SessionService;
import com.lovelin.remind.service.WxSubscribeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 提醒推送相关接口
 */
@RestController
@RequestMapping("/api/remind")
public class RemindController {

    private final ReminderService reminderService;
    private final WxSubscribeService wxSubscribeService;
    private final SessionService sessionService;

    public RemindController(ReminderService reminderService, WxSubscribeService wxSubscribeService, SessionService sessionService) {
        this.reminderService = reminderService;
        this.wxSubscribeService = wxSubscribeService;
        this.sessionService = sessionService;
    }

    /**
     * 微信 code 换 openid + token（登录接口）
     */
    @GetMapping("/openid")
    public ResponseEntity<Map<String, Object>> openid(@RequestParam String code) {
        String openid = wxSubscribeService.code2Session(code);
        String token = sessionService.createSession(openid);
        return ResponseEntity.ok(Map.of("success", true, "openid", openid, "token", token));
    }

    /**
     * 创建提醒
     */
    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body) {
        String openid = requireOpenid(body);
        if (openid == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "未登录或登录已过期"));
        }
        reminderService.createReminder(body, openid);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * 获取提醒列表
     */
    @PostMapping("/list")
    public ResponseEntity<Map<String, Object>> list(@RequestBody Map<String, Object> body) {
        String openid = requireOpenid(body);
        if (openid == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "未登录或登录已过期"));
        }
        var reminders = reminderService.listReminders(openid);
        return ResponseEntity.ok(Map.of("success", true, "reminders", reminders));
    }

    /**
     * 标记完成
     */
    @PostMapping("/complete")
    public ResponseEntity<Map<String, Object>> complete(@RequestBody Map<String, Object> body) {
        String openid = requireOpenid(body);
        if (openid == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "未登录或登录已过期"));
        }
        String id = toString(body.get("id"));
        if (id == null || id.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "参数不完整"));
        }
        try {
            reminderService.completeReminder(id, openid);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 删除提醒
     */
    @PostMapping("/delete")
    public ResponseEntity<Map<String, Object>> delete(@RequestBody Map<String, Object> body) {
        String openid = requireOpenid(body);
        if (openid == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "未登录或登录已过期"));
        }
        String id = toString(body.get("id"));
        if (id == null || id.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "参数不完整"));
        }
        try {
            reminderService.deleteReminder(id, openid);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (RuntimeException e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 从请求体中通过 token 获取 openid
     */
    private String requireOpenid(Map<String, Object> body) {
        String token = toString(body.get("token"));
        if (token == null || token.isEmpty()) return null;
        return sessionService.getOpenid(token);
    }

    private String toString(Object val) {
        return val != null ? String.valueOf(val) : null;
    }
}
