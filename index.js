/**
 * Created by sban on 2017/5/29.
 */

'use strict'

let service = require('./lib/service')
let Promise = require('./lib/bluebird-3.5.0.min')
let qiniu = require('./lib/qiniu')
let page = require('./lib/page')
let promise = {
  all: Promise.all,
}

// serverUrlBase: "http://localhost:4000" //本地地址,"http://192.168.3.45:4000"
// serverUrlBase: "https://api.rixingyike.com/wegame" //线上地址
let app = {
  data: {
    userInfo: null,//验证后的用户信息对象
    loading: false,
  },
  version: "1.0",
  service: service,
  promise: promise,
  page: page,
  config: {
    showLoadingOnRequest: false //发起http请求时是否自动显示”加载中“提示
    , enableWeappUserAutoLogin: true //启用小程序用户自动登陆服务器端,需要server端支持
    , serverUrlBase: "http://192.168.0.28:4000" //服务端基础地址
    , qiniu:{
      serverBase:"http://7xndm1.com1.z0.glb.clouddn.com/"
      ,uploadUrl:"https://up.qbox.me"
      ,uptokenPath:"/qiniu/uptoken"
    }
  }
}

// 向服务器发起http请求
function request(url, data, options) {
  return new Promise(function (resolve, reject) {
    // wx.showNavigationBarLoading()

    // 调用成功、失败都会执行
    let complete = function () {
      if (app.config.showLoadingOnRequest) wx.hideLoading()
      // wx.hideNavigationBarLoading()
    }

    // 去掉微信的封装,直接返回服务器的结果
    let success = function (res) {
      if (res.statusCode == 200 && res.errMsg == "request:ok") {
        resolve(res.data)
      } else {
        reject(res.errMsg)
      }
    }
    let args = {
      url: url,
      header: { 'Content-Type': 'json' },
      success: success,
      fail: reject,
      complete: complete,
    }
    if (data) {
      if (options && !options["method"]){
        // 如果有数据，但是没指定method为post，默认为post
        args["method"] = "POST"
      }
      args["data"] = data
    }
    if (options) {
      Object.assign(args, options)
    }
    // console.log(app.config.enableWeappUserAutoLogin,app.data.userInfo)
    if (app.config.enableWeappUserAutoLogin && app.data.userInfo) {
      args.header["X-WX-Id"] = app.data.userInfo.id
    }
    if (app.config.showLoadingOnRequest) {
      wx.showLoading({
        title: '加载中',
      })
    }
    wx.request(args)
  })
}

// 拉取当前微信用户信息
function getUserInfo() {
  return new Promise(function (resolve, reject) {
    if (app.data.userInfo) {
      resolve(app.data.userInfo)
      return
    }

    // wx.showNavigationBarLoading()
    let complete = function () {
      // wx.hideNavigationBarLoading()
    }
    reject = reject || (function(err){
      console.log(err)
    })

    wx.login({
      success: res => {
        let code = res.code
        // console.log("wx.login res",res)
        wx.getUserInfo({
          success: res => {
            // console.log("wx.getUserInfo res",res)
            if (!app.config.enableWeappUserAutoLogin) {
              app.data.userInfo = res.userInfo
              resolve(res.userInfo)
            } else {
              let header = {
                "X-WX-Code": code,
                "X-WX-Encrypted-Data": res.encryptedData,
                "X-WX-IV": res.iv
              }
              // console.log("login header", header)
              wx.request({
                url: `${app.config.serverUrlBase}/weapp/login`,
                header: header,
                success: res => {
                  if (res.statusCode == 200 && res.errMsg == "request:ok") {
                    let data = res.data
                    if (data.code == 1){
                      let user = data.data
                      app.data.userInfo = user
                      resolve(user)
                    }else{
                      reject(data.message)
                    }
                  }else{
                    reject("weapp request err")
                  }
                },
                fail: reject,
                complete: complete
              })
            }
          },
          fail: reject,
          complete: complete
        })
      },
      fail: reject,
      complete: complete
    })
  })
}

// 小程序用户登陆
function login(userInfo) {
  console.log("userInfo", userInfo)
}

// 人性化可读格式化时间
function humanFormatTime(ms) {
  const formatNumber = function (n) {
    n = n.toString()
    return n[1] ? n : `0${n}`
  }
  // ms = ms * 1000
  let d_second, d_minutes, d_hours, d_days
  let timeNow = new Date().getTime()
  let d = (timeNow - ms) / 1000
  d_days = Math.round(d / (24 * 60 * 60))
  d_hours = Math.round(d / (60 * 60))
  d_minutes = Math.round(d / 60)
  d_second = Math.round(d)
  if (d_days > 0 && d_days < 2) {
    return `${d_days}天前`
  } else if (d_days <= 0 && d_hours > 0) {
    return `${d_hours}小时前`
  } else if (d_hours <= 0 && d_minutes > 0) {
    return `${d_minutes}分钟前`
  } else if (d_minutes <= 0 && d_second >= 0) {
    return '刚刚'
  } else {
    let s = new Date()
    s.setTime(ms)
    return [s.getFullYear(), s.getMonth() + 1, s.getDate()].map(formatNumber).join('/') + ' ' + [s.getHours(), s.getMinutes()].map(formatNumber).join(':')
  }
}

// 上传图片至七牛服务器
function uploadToQiniu(localFile) {
  return new Promise(function (resolve, reject) {
    // wx.showNavigationBarLoading()

    // 去掉微信的封装,直接返回服务器的结果
    let success = function (res) {
      // wx.hideNavigationBarLoading()
      resolve(res.imageURL)
      console.log(res)
    }
    reject = reject || (function (err) {
      // wx.hideNavigationBarLoading()
      console.log(err)
    })
    let options = {
      uploadURL: app.config.qiniu.uploadUrl,
      domain: app.config.qiniu.serverBase,
      uptokenURL: `${app.config.serverUrlBase}${app.config.qiniu.uptokenPath}`
    }
    // console.log(options)
    qiniu.upload(localFile, success, reject, options)
  })
}

// 选择或拍摄一张图片,上传至七牛云存储
function selectAndUploadImageToQiniu() {
  return new Promise(function (resolve, reject) {
    wx.chooseImage({
      count: 1, // 默认9
      sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
      success: res => {
        let localImgFile = res.tempFilePaths[0]
        uploadToQiniu(localImgFile).then(resolve).catch(reject)
      },
      fail:reject
    })
  })
}

// 获取微信群id
function getWXGroupID(callback) {
  let options = wx.getLaunchOptionsSync()
  let shareTicket = options.shareTicket
  console.log("shareTicket", shareTicket)
  if (!shareTicket) {
    callback(null)
    return
  }

  let getGid = function (res) {
    var data = {
      encrypted_data: res.encryptedData,
      iv: res.iv,
      code: res.code,
    }
    wx.request({
      method: 'POST',
      data: data,
      url: `${app.config.serverUrlBase}/weapp/unencrypt_groupid`,
      header: {
        'content-type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode == 200 && res.errMsg == 'request:ok') {
          console.log("unencryptgid", res.data)
          var data = res.data
          if (data && data.data) {
            var openGId = data.data.openGId
            // console.log("来源群id", openGId)
            callback(openGId)
          }
        }
      }
    })
  }
  wx.getShareInfo({
    shareTicket: shareTicket,
    success: res => {
      if (res.errMsg == "getShareInfo:ok") {
        wx.login({
          success: (res2) => {
            res["code"] = res2.code
            getGid(res)
          }
        })

      }
    }
  })
}

// 检测网络状态
let networkType = "unknown"
function watchNetwork() {
  const onNetworkTypeChanged = function (nt) {
    if (networkType != nt) {
      networkType = nt
      switch (networkType) {
        case "wifi":
          console.log("网络状态Ok")
          break;
        case "2g":
        case "3g":
        case "4g":
          wx.showModal({
            title: '提示',
            content: '当前处于移动网络，请注意流量消耗',
            showCancel: false,
          })
          break
        default:
          wx.showModal({
            title: '提示',
            content: '网络不通，请检查',
            showCancel: false,
          })
      }
    }
  }
  wx.getNetworkType({
    success(res) {
      console.log("网络类型：", res.networkType)
      onNetworkTypeChanged(res.networkType)
    }
  })
  wx.onNetworkStatusChange((res) => {
    console.log("网络类型变化为：", res.networkType)
    onNetworkTypeChanged(res.networkType)
    console.log(res.isConnected)
  })
}

app.request = request
app.getUserInfo = getUserInfo
app.humanFormatTime = humanFormatTime
app.uploadToQiniu = uploadToQiniu
app.selectAndUploadImageToQiniu = selectAndUploadImageToQiniu
app.page = page
app.getWXGroupID = getWXGroupID
app.watchNetwork = watchNetwork

module.exports = app