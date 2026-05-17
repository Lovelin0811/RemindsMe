// API 基础配置
const BASE_URL = 'https://lovelin.com.cn/api/remind'

// 缓存 openid
let cachedOpenid = ''

// 获取 openid（wx.login 换取）
const getOpenid = () => {
  if (cachedOpenid) return Promise.resolve(cachedOpenid)
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (!res.code) { reject(new Error('wx.login 失败')); return }
        wx.request({
          url: BASE_URL + '/openid?code=' + res.code,
          method: 'GET',
          timeout: 10000,
          success(resp) {
            if (resp.statusCode === 200 && resp.data.openid) {
              cachedOpenid = resp.data.openid
              wx.setStorageSync('openid', cachedOpenid)
              resolve(cachedOpenid)
            } else {
              reject(new Error('获取 openid 失败'))
            }
          },
          fail: reject
        })
      },
      fail: reject
    })
  })
}

// 启动时从缓存恢复
cachedOpenid = wx.getStorageSync('openid') || ''

const request = (options) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      timeout: 10000,
      header: {
        'Content-Type': 'application/json'
      },
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.data)
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

// 发送订阅消息授权记录到后端（自动带 openid）
const subscribeNotify = (data) => {
  return getOpenid().then((openid) => {
    return request({
      url: '/subscribe',
      method: 'POST',
      data: Object.assign({}, data, { openid: openid })
    })
  })
}

// 创建提醒
const createReminder = (data) => {
  return getOpenid().then((openid) => {
    return request({
      url: '/create',
      method: 'POST',
      data: Object.assign({}, data, { openid: openid })
    })
  })
}

// 获取提醒列表
const getReminders = () => {
  return getOpenid().then((openid) => {
    return request({
      url: '/list?openid=' + openid,
      method: 'GET'
    })
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

module.exports = {
  request,
  createReminder,
  getReminders,
  completeReminder,
  deleteReminder,
  subscribeNotify,
  getOpenid
}
