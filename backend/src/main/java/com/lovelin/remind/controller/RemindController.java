package com.lovelin.remind.controller;

import com.lovelin.remind.service.ReminderService;
import com.lovelin.remind.service.WxSubscribeService;
import jakarta.servlet.http.HttpServletRequest;
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

    public RemindController(ReminderService reminderService, WxSubscribeService wxSubscribeService) {
        this.reminderService = reminderService;
        this.wxSubscribeService = wxSubscribeService;
    }

    /**
     * 接收小程序端的订阅消息授权记录
     */
    @PostMapping("/subscribe")
    public ResponseEntity<Map<String, Object>> subscribe(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String openid = (String) body.get("openid");
        reminderService.saveSubscription(body, openid);
        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * 创建提醒（同步到后端）
     */
    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String openid = (String) body.get("openid");
        reminderService.createReminder(body, openid);
        return ResponseEntity.ok(Map.of("success", true, "id", body.getOrDefault("id", "")));
    }

    /**
     * 获取提醒列表（POST body 传 openid，避免 URL 泄露）
     */
    @PostMapping("/list")
    public ResponseEntity<Map<String, Object>> list(@RequestBody Map<String, Object> body) {
        String openid = (String) body.get("openid");
        var reminders = reminderService.listReminders(openid);
        return ResponseEntity.ok(Map.of("success", true, "reminders", reminders));
    }

    /**
     * 标记完成
     */
    @PostMapping("/complete")
    public ResponseEntity<Map<String, Object>> complete(@RequestBody Map<String, Object> body) {
        String openid = toString(body.get("openid"));
        String id = toString(body.get("id"));
        if (openid == null || openid.isEmpty() || id == null || id.isEmpty()) {
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
        String openid = toString(body.get("openid"));
        String id = toString(body.get("id"));
        if (openid == null || openid.isEmpty() || id == null || id.isEmpty()) {
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
     * 微信 code 换 openid（RemindsMe 用，无需登录态）
     */
    @GetMapping("/openid")
    public ResponseEntity<Map<String, Object>> openid(@RequestParam String code) {
        String openid = wxSubscribeService.code2Session(code);
        return ResponseEntity.ok(Map.of("success", true, "openid", openid));
    }

    /**
     * 手动测试推送
     */
    @PostMapping("/test-push")
    public ResponseEntity<Map<String, Object>> testPush(
            @RequestParam String openid,
            @RequestParam String templateId,
            @RequestParam String reminderContent) {

        try {
            wxSubscribeService.sendReminderPush(openid, templateId, reminderContent, "");
            return ResponseEntity.ok(Map.of("success", true, "message", "推送成功"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("success", false, "message", e.getMessage()));
        }
    }

    private String toString(Object val) {
        return val != null ? String.valueOf(val) : null;
    }
}
