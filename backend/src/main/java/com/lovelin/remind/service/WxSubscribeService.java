package com.lovelin.remind.service;

import net.minidev.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * 微信订阅消息推送服务
 */
@Service
public class WxSubscribeService {

    private static final Logger log = LoggerFactory.getLogger(WxSubscribeService.class);
    private final SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd HH:mm");

    @Value("${wx.appid:}")
    private String appid;

    @Value("${wx.secret:}")
    private String secret;

    private final RestTemplate restTemplate;

    public WxSubscribeService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);   // 连接超时 5 秒
        factory.setReadTimeout(10000);     // 读取超时 10 秒
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * 获取微信 access_token（带缓存）
     */
    private String cachedToken = null;
    private long tokenExpireAt = 0;

    public synchronized String getAccessToken() {
        if (cachedToken != null && System.currentTimeMillis() < tokenExpireAt) {
            return cachedToken;
        }

        String url = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=" + appid + "&secret=" + secret;
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        try {
            JSONObject json = (JSONObject) new net.minidev.json.parser.JSONParser(net.minidev.json.parser.JSONParser.DEFAULT_PERMISSIVE_MODE).parse(response.getBody());

            if (json.containsKey("access_token")) {
                cachedToken = json.getAsString("access_token");
                // 提前5分钟过期
                long expiresIn = json.getAsNumber("expires_in") != null ? json.getAsNumber("expires_in").longValue() : 7200;
                tokenExpireAt = System.currentTimeMillis() + (expiresIn - 300) * 1000;
                return cachedToken;
            }

            throw new RuntimeException("获取 access_token 失败: " + response.getBody());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("解析 access_token 失败: " + e.getMessage());
        }
    }

    /**
     * 发送订阅消息
     */
    public void sendSubscribeMessage(String openid, String templateId, String page, JSONObject data) {
        String accessToken = getAccessToken();
        String url = "https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=" + accessToken;

        JSONObject body = new JSONObject();
        body.put("touser", openid);
        body.put("template_id", templateId);
        body.put("page", page);
        body.put("data", data);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(body.toJSONString(), headers);

        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);

        try {
            JSONObject result = (JSONObject) new net.minidev.json.parser.JSONParser(net.minidev.json.parser.JSONParser.DEFAULT_PERMISSIVE_MODE).parse(response.getBody());
            int errcode = result.getAsNumber("errcode") != null ? result.getAsNumber("errcode").intValue() : -1;
            if (errcode != 0) {
                log.warn("发送订阅消息失败: errcode={}, errmsg={}", errcode, result.getAsString("errmsg"));
                throw new RuntimeException("发送订阅消息失败: errcode=" + errcode + ", errmsg=" + result.getAsString("errmsg"));
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("解析推送结果失败: " + e.getMessage());
        }
    }

    /**
     * code 换 openid（微信 jscode2session）
     */
    public String code2Session(String code) {
        String url = "https://api.weixin.qq.com/sns/jscode2session?appid=" + appid + "&secret=" + secret + "&js_code=" + code + "&grant_type=authorization_code";
        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        try {
            JSONObject json = (JSONObject) new net.minidev.json.parser.JSONParser(net.minidev.json.parser.JSONParser.DEFAULT_PERMISSIVE_MODE).parse(response.getBody());
            if (json.containsKey("openid")) {
                return json.getAsString("openid");
            }
            throw new RuntimeException("code2session 失败: " + response.getBody());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("解析 code2session 结果失败: " + e.getMessage());
        }
    }

    /**
     * 便捷方法：发送提醒推送
     * 模板字段：time2(开始时间) time3(到期时间) phrase4(订单状态) thing5(备注)
     */
    public void sendReminderPush(String openid, String templateId, String title, String note) {
        JSONObject data = new JSONObject();

        // thing1 = 提醒标题
        JSONObject thing1 = new JSONObject();
        thing1.put("value", title != null && !title.isEmpty() ? title : "提醒");
        data.put("thing1", thing1);

        // phrase2 = 状态
        JSONObject phrase2 = new JSONObject();
        phrase2.put("value", "时间差不多咯");
        data.put("phrase2", phrase2);

        // time3 = 提醒时间
        JSONObject time3 = new JSONObject();
        time3.put("value", fmt.format(new Date()));
        data.put("time3", time3);

        // thing4 = 备注/提示
        JSONObject thing4 = new JSONObject();
        String noteVal = (note != null && !note.isEmpty()) ? note : "";
        thing4.put("value", noteVal.length() > 20 ? noteVal.substring(0, 20) : noteVal);
        data.put("thing4", thing4);

        sendSubscribeMessage(openid, templateId, "pages/index/index", data);
    }
}
