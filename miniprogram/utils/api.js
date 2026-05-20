// API 基础配置
const BASE_URL = 'https://lovelin.com.cn/api/remind'

// 缓存 token 和 openid
let cachedToken = ''
let cachedOpenid = ''

// 获取 token 和 openid（wx.login 换取）
const getOpenid = () => {
  if (cachedToken) return Promise.resolve(cachedOpenid)
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (!res.code) { reject(new Error('wx.login 失败')); return }
        wx.request({
          url: BASE_URL + '/openid?code=' + res.code,
          method: 'GET',
          timeout: 10000,
          success(resp) {
            if (resp.statusCode === 200 && resp.data.token) {
              cachedToken = resp.data.token
              cachedOpenid = resp.data.openid
              wx.setStorageSync('token', cachedToken)
              wx.setStorageSync('openid', cachedOpenid)
              resolve(cachedOpenid)
            } else {
              reject(new Error('登录失败'))
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
cachedToken = wx.getStorageSync('token') || ''
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
        } else if (res.statusCode === 401) {
          // token 过期，清除缓存重新登录
          cachedToken = ''
          cachedOpenid = ''
          wx.removeStorageSync('token')
          wx.removeStorageSync('openid')
          getOpenid().then(() => {
            // 重试一次
            options.data = options.data || {}
            options.data.token = cachedToken
            wx.request({
              url: BASE_URL + options.url,
              method: options.method || 'GET',
              data: options.data,
              timeout: 10000,
              header: { 'Content-Type': 'application/json' },
              success(retryRes) {
                if (retryRes.statusCode === 200) {
                  resolve(retryRes.data)
                } else {
                  reject(retryRes.data)
                }
              },
              fail: reject
            })
          }).catch(reject)
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

// 获取提醒列表
const getReminders = () => {
  return getOpenid().then(() => {
    return request({
      url: '/list',
      method: 'POST',
      data: { token: cachedToken }
    })
  })
}

// 创建提醒
const createReminder = (data) => {
  return getOpenid().then(() => {
    return request({
      url: '/create',
      method: 'POST',
      data: Object.assign({}, data, { token: cachedToken })
    })
  })
}

// 标记完成
const completeReminder = (id) => {
  return getOpenid().then(() => {
    return request({
      url: '/complete',
      method: 'POST',
      data: { id, token: cachedToken }
    })
  })
}

// 删除提醒
const deleteReminder = (id) => {
  return getOpenid().then(() => {
    return request({
      url: '/delete',
      method: 'POST',
      data: { id, token: cachedToken }
    })
  })
}

module.exports = {
  request,
  createReminder,
  getReminders,
  completeReminder,
  deleteReminder,
  getOpenid
}
