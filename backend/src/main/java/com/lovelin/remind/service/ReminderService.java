package com.lovelin.remind.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 提醒数据服务
 */
@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);
    private final JdbcTemplate jdbcTemplate;

    public ReminderService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 保存订阅授权记录
     */
    public void saveSubscription(Map<String, Object> body, String openid) {
        long now = System.currentTimeMillis();
        jdbcTemplate.update("""
            INSERT INTO reminder_subscriptions
                (openid, reminder_id, template_id, title, note, reminder_time, type, type_label,
                 interval_label, repeat_rule, repeat_time, repeat_weekday, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
            """,
            openid != null ? openid : "",
            body.getOrDefault("reminderId", ""),
            body.getOrDefault("templateId", ""),
            body.getOrDefault("title", ""),
            body.getOrDefault("note", ""),
            toLong(body.get("reminderTime")),
            body.getOrDefault("type", ""),
            body.getOrDefault("typeLabel", ""),
            body.getOrDefault("intervalLabel", ""),
            body.getOrDefault("repeatRule", ""),
            body.getOrDefault("repeatTime", ""),
            toInt(body.get("repeatWeekday")),
            now
        );
    }

    /**
     * 创建提醒
     */
    public void createReminder(Map<String, Object> body, String openid) {
        saveSubscription(body, openid);
    }

    /**
     * 获取提醒列表
     */
    public List<Map<String, Object>> listReminders(String openid) {
        if (openid == null || openid.isEmpty()) {
            return List.of();
        }
        return jdbcTemplate.queryForList(
            "SELECT * FROM reminder_subscriptions WHERE openid = ? ORDER BY created_at DESC LIMIT 100",
            openid
        );
    }

    /**
     * 标记完成
     */
    public void completeReminder(String reminderId, String openid) {
        int rows = jdbcTemplate.update(
            "UPDATE reminder_subscriptions SET status = 'completed' WHERE id = ? AND openid = ?",
            Long.parseLong(reminderId), openid
        );
        if (rows == 0) {
            throw new RuntimeException("提醒不存在或无权操作");
        }
    }

    /**
     * 删除提醒
     */
    public void deleteReminder(String reminderId, String openid) {
        int rows = jdbcTemplate.update(
            "DELETE FROM reminder_subscriptions WHERE id = ? AND openid = ?",
            Long.parseLong(reminderId), openid
        );
        if (rows == 0) {
            throw new RuntimeException("提醒不存在或无权操作");
        }
    }

    /**
     * 查询到期未推送的提醒
     */
    public List<Map<String, Object>> findDueReminders(long now) {
        return jdbcTemplate.queryForList(
            "SELECT * FROM reminder_subscriptions WHERE status = 'pending' AND reminder_time <= ? ORDER BY reminder_time ASC LIMIT 50",
            now
        );
    }

    /**
     * 标记为已推送
     */
    public void markPushed(long id) {
        jdbcTemplate.update(
            "UPDATE reminder_subscriptions SET status = 'pushed', pushed_at = ? WHERE id = ?",
            System.currentTimeMillis(), id
        );
    }

    /**
     * 标记推送失败
     */
    public void markPushFailed(long id) {
        jdbcTemplate.update(
            "UPDATE reminder_subscriptions SET status = 'push_failed', pushed_at = ? WHERE id = ?",
            System.currentTimeMillis(), id
        );
    }

    /**
     * 更新定期提醒的下一次触发时间
     */
    public void updateNextReminderTime(long id, long nextTime) {
        jdbcTemplate.update(
            "UPDATE reminder_subscriptions SET reminder_time = ?, status = 'pending' WHERE id = ?",
            nextTime, id
        );
    }

    private long toLong(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return 0; }
    }

    private int toInt(Object val) {
        if (val == null) return 0;
        if (val instanceof Number) return ((Number) val).intValue();
        try { return Integer.parseInt(val.toString()); } catch (Exception e) { return 0; }
    }
}
