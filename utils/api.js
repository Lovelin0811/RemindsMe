// API 基础配置
// TODO: 替换为你的后端服务地址
const BASE_URL = 'https://lovelin.com.cn/api/remind'

const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token')
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: 10000,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? ('Bearer ' + token) : ''
      },
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // token 过期，需要重新登录
          wx.removeStorageSync('token')
          reject(res.data)
        } else {
          reject(res.data)
        }
      },
      fail(err) {
        reject(err)
      }
    })
  })
}

// 创建提醒（提交到后端）
const createReminder = (data) => {
  return request({
    url: '/create',
    method: 'POST',
    data
  })
}

// 获取提醒列表
const getReminders = () => {
  return request({
    url: '/list',
    method: 'GET'
  })
}

// 标记完成
const completeReminder = (id) => {
  return request({
    url: '/complete',
    method: 'POST',
    data: { id }
  })
}

// 删除提醒
const deleteReminder = (id) => {
  return request({
    url: '/delete',
    method: 'POST',
    data: { id }
  })
}

// 发送订阅消息授权记录到后端
const subscribeNotify = (data) => {
  return request({
    url: '/subscribe',
    method: 'POST',
    data
  })
}

module.exports = {
  request,
  createReminder,
  getReminders,
  completeReminder,
  deleteReminder,
  subscribeNotify
}
