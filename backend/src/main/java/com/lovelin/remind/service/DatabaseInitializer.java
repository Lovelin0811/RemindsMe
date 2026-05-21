package com.lovelin.remind.service;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        jdbcTemplate.execute("""
            CREATE TABLE IF NOT EXISTS reminder_subscriptions (
              id BIGINT PRIMARY KEY AUTO_INCREMENT,
              openid VARCHAR(128) NOT NULL,
              reminder_id VARCHAR(64) NOT NULL,
              template_id VARCHAR(128) NOT NULL,
              title VARCHAR(255) NOT NULL DEFAULT '',
              note VARCHAR(500) NOT NULL DEFAULT '',
              reminder_time BIGINT NOT NULL,
              type VARCHAR(32) NOT NULL DEFAULT '',
              type_label VARCHAR(64) NOT NULL DEFAULT '',
              interval_label VARCHAR(128) NOT NULL DEFAULT '',
              repeat_rule VARCHAR(32) NOT NULL DEFAULT '',
              repeat_time VARCHAR(16) NOT NULL DEFAULT '',
              repeat_weekday INT NOT NULL DEFAULT 0,
              repeat_month_day INT NOT NULL DEFAULT 1,
              status VARCHAR(16) NOT NULL DEFAULT 'pending',
              pushed_at BIGINT NULL,
              created_at BIGINT NOT NULL,
              INDEX idx_reminder_sub_status_time(status, reminder_time),
              INDEX idx_reminder_sub_openid(openid)
            )
            """);

        // 兼容已有表：自动添加缺失的列
        addColumnIfMissing(jdbcTemplate, "reminder_subscriptions", "repeat_month_day", "INT NOT NULL DEFAULT 1");
    }

    private void addColumnIfMissing(JdbcTemplate jdbcTemplate, String table, String column, String definition) {
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition);
        } catch (Exception e) {
            // 列已存在时忽略
        }
    }
}
