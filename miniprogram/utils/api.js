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

// 获取提醒列表（POST body 传 openid，避免 URL 泄露）
const getReminders = () => {
  return getOpenid().then((openid) => {
    return request({
      url: '/list',
      method: 'POST',
      data: { openid }
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

// 标记完成
const completeReminder = (id) => {
  return getOpenid().then((openid) => {
    return request({
      url: '/complete',
      method: 'POST',
      data: { id, openid }
    })
  })
}

// 删除提醒
const deleteReminder = (id) => {
  return getOpenid().then((openid) => {
    return request({
      url: '/delete',
      method: 'POST',
      data: { id, openid }
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
