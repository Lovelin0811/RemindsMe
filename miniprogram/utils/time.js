/**
 * 公共时间工具函数
 * 被 add、index、mine 等页面共用
 */

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * 计算定期提醒的下一次触发时间
 * @param {string} rule - daily | weekday | weekly | monthly
 * @param {string} setTime - HH:mm 格式
 * @param {number} now - 当前时间戳（ms）
 * @param {number} [repeatWeekday] - 每周几（0=周日），weekly 时必传
 * @param {number} [repeatMonthDay] - 每月几号（1-31），monthly 时必传
 * @returns {Date}
 */
function getNextOccurrence(rule, setTime, now, repeatWeekday, repeatMonthDay) {
  var parts = setTime.split(':').map(Number)
  var h = parts[0]
  var m = parts[1]
  var target = new Date(now)
  target.setHours(h, m, 0, 0)

  switch (rule) {
    case 'daily':
      if (target <= now) target.setDate(target.getDate() + 1)
      return target
    case 'weekday':
      while (target.getDay() === 0 || target.getDay() === 6 || target <= now) {
        target.setDate(target.getDate() + 1)
      }
      return target
    case 'weekly': {
      var wd = parseInt(repeatWeekday || '1')
      var diff = wd - target.getDay()
      if (diff < 0 || (diff === 0 && target <= now)) diff += 7
      target.setDate(target.getDate() + diff)
      return target
    }
    case 'monthly': {
      var md = parseInt(repeatMonthDay || '1')
      var maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
      if (md > maxDay) md = maxDay
      target.setDate(md)
      if (target <= now) {
        target.setMonth(target.getMonth() + 1)
        maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
        if (md > maxDay) target.setDate(maxDay)
        else target.setDate(md)
      }
      return target
    }
    default:
      if (target <= now) target.setDate(target.getDate() + 1)
      return target
  }
}

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function fmtDate(d) {
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

function fmtTime(d) {
  return pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function fmtDateTime(d) {
  return fmtDate(d) + ' ' + fmtTime(d)
}

function fmtDateTimeSec(d) {
  return fmtDate(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

/**
 * 构建倒计时文本
 * @param {number} diff - 目标时间 - 当前时间（ms）
 * @param {Date} target - 目标时间 Date
 * @returns {string}
 */
function buildDiffText(diff, target) {
  var dt = fmtDateTimeSec(target)

  if (diff < 0) return dt + '（已过时）'
  if (diff < 60000) return '不到 1 分钟后（' + dt + '）'

  var mins = Math.ceil(diff / 60000)
  var hours = Math.floor(diff / 3600000)
  var remainMin = Math.ceil((diff % 3600000) / 60000)

  if (mins < 60) return mins + ' 分钟后（' + dt + '）'
  if (hours < 24) return hours + ' 小时 ' + remainMin + ' 分后（' + dt + '）'

  var days = Math.floor(diff / 86400000)
  var remainH = Math.floor((diff % 86400000) / 3600000)
  return days + ' 天 ' + remainH + ' 小时后（' + dt + '）'
}

/**
 * 格式化倒计时：X天 X小时 X分 X秒
 * @param {number} diff - 毫秒差
 * @returns {string}
 */
function formatCountdown(diff) {
  var d = Math.floor(diff / 86400000)
  var h = Math.floor((diff % 86400000) / 3600000)
  var m = Math.floor((diff % 3600000) / 60000)
  var s = Math.floor((diff % 60000) / 1000)

  var text = ''
  if (d > 0) text += d + '天 '
  text += h + '小时 ' + m + '分 ' + s + '秒'
  return text
}

module.exports = {
  WEEKDAYS: WEEKDAYS,
  getNextOccurrence: getNextOccurrence,
  pad: pad,
  fmtDate: fmtDate,
  fmtTime: fmtTime,
  fmtDateTime: fmtDateTime,
  fmtDateTimeSec: fmtDateTimeSec,
  buildDiffText: buildDiffText,
  formatCountdown: formatCountdown
}
