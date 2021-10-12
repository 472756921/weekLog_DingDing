Page({
  data: {
    access_token: "",
    logdata: { done: [], doing: [], next: [] },
    getCDRES: '',
    dduser: { name: '' },
    weekTempLog: {},
    userList: [{ account: 'chenyucheng', pwd: 'hiseas.123', username: '陈昱成' }, { account: 'jerry.liao', pwd: 'hiseas.321', username: '廖杰俊' }, { account: 'colabread.ding', pwd: 'Chandao007', username: '丁楠' }, { account: 'chenhongshu', pwd: 'chs123456', username: '陈泓澍' }, { account: 'chenjingyan', pwd: 'cly123456', username: '陈靓艳' }]
  },
  onLoad(query) {
    // 页面加载
    console.info(`Page onLoad with query: ${JSON.stringify(query)}`);
  },
  onReady() {
    // 页面加载完成
    dd.getStorage({
      key: 'access_token',
      success: (res) => {
        if (res.data) {
          this.setData({ access_token: res.data })
          this.getUserInfo(res.data);
          return false;
        }
        this.getAc((tk) => this.getUserInfo(tk));
      },
    });


  },
  onShow() {
    // 页面显示
  },
  onHide() {
    // 页面隐藏
  },
  onUnload() {
    // 页面被关闭
  },
  onTitleClick() {
    // 标题被点击
  },
  onPullDownRefresh() {
    // 页面被下拉
  },
  onReachBottom() {
    // 页面被拉到底部
  },
  onShareAppMessage() {
    // 返回自定义分享信息
    return {
      title: 'My App',
      desc: 'My App description',
      path: 'pages/index/index',
    };
  },

  // 获取企业access_token
  getAc(cb) {
    dd.httpRequest({
      url: 'https://oapi.dingtalk.com/gettoken',
      method: 'get',
      data: {
        appkey: 'ding1jz3bnysm3lepgjc',
        appsecret: 'lQyC61zY599UA5YGDFHISkhiZMW6XTE191CRHbSgpGhBv0GHZrLUQ_eqybA-1uNP',
      },
      dataType: 'json',
      success: ({ data }) => {
        this.setData({ access_token: data.access_token })
        dd.setStorage({
          key: 'access_token',
          data: data.access_token,
        });
        cb(data.access_token);
      },
      fail: function (res) {
        dd.showToast({
          type: 'fail',
          content: '获取access_token失败',
          duration: 3000,
        })
      },
    });
  },
  // 获取钉钉用户信息
  getUserInfo(access_token) {
    dd.getAuthCode({
      success: (res) => {
        dd.httpRequest({
          url: 'https://oapi.dingtalk.com/user/getuserinfo',
          data: {
            access_token: access_token,
            code: res.authCode,
          },
          method: 'get',
          dataType: 'json',
          success: ({ data }) => {
            if (data.errcode === 40014) {
              this.getAc((tk) => this.getUserInfo(tk));
              return false;
            }
            if (data.errcode == 0) {
              this.setData({ dduser: data })
              this.getTemp({ access_token, userid: data.userid });
            }
          },
        });
      },
    });
  },

  // 获取日志模板
  getTemp({ access_token, userid }) {
    dd.httpRequest({
      url: `https://oapi.dingtalk.com/topapi/report/template/getbyname?access_token=${access_token}`,
      method: 'POST',
      data: {
        userid: userid,
        template_name: '周报',
      },
      dataType: 'json',
      success: (res) => {
        this.setData({ weekTempLog: res.data.result })

      },
    });
  },
  // 获取禅道记录
  getCDlog() {
    const u = this.userCheck();
    if (!u) {
      return false
    }
    if (u.account == '' || u.pwd == '') {
      return false;
    }
    this.setData({ getCDRES: 'doing' })
    let HOST = 'http://192.168.10.10:7001';
    let HOST2 = 'http://118.113.165.109:7001';
    let HOST3 = 'http://localhost:7001';

    dd.httpRequest({
      url: `${HOST2}?name=${u.account}&pwd=${u.pwd}`,
      method: 'get',
      dataType: 'json',
      success: ({ data }) => {
        if (data) {
          const next = data.filter(_ => _['c-status'] === '未开始');
          const done = data.filter(_ => _['c-status'] === '已完成');
          const doing = data.filter(_ => _['c-status'] === '进行中');

          this.setData({
            getCDRES: "success",
            logdata: {
              next,
              done,
              doing
            }
          })
        }
      },
      fail: (res) => {
        console.log(res)
        this.setData({ getCDRES: 'failed' })
      },
    });
  },
  // 创建周报
  createLog() {
    const u = this.userCheck();
    if (!u) {
      return false
    }

    const logdata = this.data.logdata;

    let nowWeek = '', nextWeek = '';
    const done = logdata.done.map((it, i) => `${i + 1}.${it['c-name']}`);
    const doing = logdata.doing.map((it, i) => `${i + 1}.${it['c-name']}`);
    const next = logdata.next.map((it, i) => `${i + 1}.${it['c-name']}`);

    nowWeek = done.join(';') + doing.join(';');
    nextWeek = next.join(';');

    const postData = {
      create_report_param: {
        contents: [
          {
            content_type: "markdown",
            sort: 1,
            type: 1,
            content: nowWeek,
            key: "本周工作总结"
          },
          {
            content_type: "markdown",
            sort: 2,
            type: 1,
            content: nextWeek,
            key: "下周工作计划"
          },

        ],
        dd_from: "report_robot",
        template_id: this.data.weekTempLog.id,
        userid: this.data.dduser.userid,
        to_userids: [this.data.dduser.userid, '16160640028814891'],
        to_chat: false,

      }
    }
    dd.httpRequest({
      url: `https://oapi.dingtalk.com/topapi/report/create?access_token=${this.data.access_token}`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify(postData),
      dataType: 'json',
      success: ({ data }) => {
        if (data.errcode == 0) {
          dd.showToast({
            type: 'success',
            content: '发布成功，钉钉查阅',
            duration: 2000,
          });
        }
      },
    });
  },
  // 鉴权
  userCheck() {
    const u = this.data.userList.filter(_ => _.username === this.data.dduser.name);
    if (u.length < 1) {
      dd.showToast({
        type: 'fail',
        content: '你没有权限使用该程序',
        duration: 2000,
      });
      return false;
    }
    return u[0];
  }

});
