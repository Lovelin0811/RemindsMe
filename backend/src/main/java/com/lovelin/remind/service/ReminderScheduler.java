package com.lovelin.remind.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 提醒定时推送任务
 * 每分钟扫描一次到期的提醒并发送订阅消息
 */
@Service
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    private final ReminderService reminderService;
    private final WxSubscribeService wxSubscribeService;

    public ReminderScheduler(ReminderService reminderService, WxSubscribeService wxSubscribeService) {
        this.reminderService = reminderService;
        this.wxSubscribeService = wxSubscribeService;
    }

    /**
     * 每分钟执行一次，检查到期的提醒
     */
    @Scheduled(fixedRate = 60000)
    public void checkAndPush() {
        long now = System.currentTimeMillis();
        List<Map<String, Object>> dueReminders = reminderService.findDueReminders(now);

        for (Map<String, Object> reminder : dueReminders) {
            try {
                pushReminder(reminder);
                reminderService.markPushed(toLong(reminder.get("id")));

                // 定期提醒：计算下一次触发时间
                String repeatRule = (String) reminder.get("repeat_rule");
                if (repeatRule != null && !repeatRule.isEmpty()) {
                    long nextTime = calculateNextOccurrence(
                        repeatRule,
                        now,
                        (String) reminder.get("repeat_time"),
                        toInt(reminder.get("repeat_weekday"))
                    );
                    reminderService.updateNextReminderTime(toLong(reminder.get("id")), nextTime);
                }
            } catch (Exception e) {
                log.error("推送提醒失败: id={}, error={}", reminder.get("id"), e.getMessage());
                reminderService.markPushFailed(toLong(reminder.get("id")));
            }
        }
    }

    private void pushReminder(Map<String, Object> reminder) {
        String openid = (String) reminder.get("openid");
        String templateId = (String) reminder.get("template_id");
        String title = (String) reminder.get("title");
        String note = (String) reminder.get("note");

        wxSubscribeService.sendReminderPush(openid, templateId, title, note);
        log.info("推送提醒成功: openid={}, title={}", openid, title);
    }

    private long calculateNextOccurrence(String repeatRule, long currentTime, String repeatTimeStr, int repeatWeekday) {
        if (repeatTimeStr == null || repeatTimeStr.isEmpty()) return currentTime + 86400000;

        String[] parts = repeatTimeStr.split(":");
        int hour = Integer.parseInt(parts[0]);
        int minute = Integer.parseInt(parts[1]);

        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.setTimeInMillis(currentTime);
        cal.set(java.util.Calendar.HOUR_OF_DAY, hour);
        cal.set(java.util.Calendar.MINUTE, minute);
        cal.set(java.util.Calendar.SECOND, 0);
        cal.set(java.util.Calendar.MILLISECOND, 0);

        return switch (repeatRule) {
            case "daily" -> {
                if (cal.getTimeInMillis() <= currentTime) cal.add(java.util.Calendar.DAY_OF_MONTH, 1);
                yield cal.getTimeInMillis();
            }
            case "weekday" -> {
                while (cal.get(java.util.Calendar.DAY_OF_WEEK) == java.util.Calendar.SUNDAY
                        || cal.get(java.util.Calendar.DAY_OF_WEEK) == java.util.Calendar.SATURDAY
                        || cal.getTimeInMillis() <= currentTime) {
                    cal.add(java.util.Calendar.DAY_OF_MONTH, 1);
                }
                yield cal.getTimeInMillis();
            }
            case "weekly" -> {
                int targetDay = switch (repeatWeekday) {
                    case 0 -> java.util.Calendar.SUNDAY;
                    case 1 -> java.util.Calendar.MONDAY;
                    case 2 -> java.util.Calendar.TUESDAY;
                    case 3 -> java.util.Calendar.WEDNESDAY;
                    case 4 -> java.util.Calendar.THURSDAY;
                    case 5 -> java.util.Calendar.FRIDAY;
                    default -> java.util.Calendar.SATURDAY;
                };
                int diff = targetDay - cal.get(java.util.Calendar.DAY_OF_WEEK);
                if (diff < 0 || (diff == 0 && cal.getTimeInMillis() <= currentTime)) diff += 7;
                cal.add(java.util.Calendar.DAY_OF_MONTH, diff);
                yield cal.getTimeInMillis();
            }
            case "monthly" -> {
                if (cal.getTimeInMillis() <= currentTime) cal.add(java.util.Calendar.MONTH, 1);
                yield cal.getTimeInMillis();
            }
            default -> currentTime + 86400000;
        };
    }

    private long toLong(Object val) {
        if (val instanceof Number) return ((Number) val).longValue();
        try { return Long.parseLong(val.toString()); } catch (Exception e) { return 0; }
    }

    private int toInt(Object val) {
        if (val instanceof Number) return ((Number) val).intValue();
        try { return Integer.parseInt(val.toString()); } catch (Exception e) { return 0; }
    }
}
