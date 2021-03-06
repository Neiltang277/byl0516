import { Res, Get, Post, Controller, Req, Param, Body, Query } from '@nestjs/common';
import { ClientService } from './client.service';
import AV = require('leancloud-storage');
import moment = require('moment');
import base64url from 'base64url';
import rp = require('request-promise');
import http = require('http');
// import { get } from 'axios';
// import {encode} from 'base64-url';
// import { shareBoy1 } from './../helper/shareItem.js';
const PageViewLogger = AV.Object.extend('PageViewLogger');
const Setting = AV.Object.extend('Setting');
const LuckyDogs = AV.Object.extend('LuckyDogs');
const GoldMaster = AV.Object.extend('GoldMaster');

const boy1 = 'http://byl0516.blissr.com.cn/boy1.png?';
const shareBoy1 = 'http://byl0516.blissr.com.cn/share-boy1.png?';
const boy2 = 'http://byl0516.blissr.com.cn/boy2.png?';
const shareBoy2 = 'http://byl0516.blissr.com.cn/share-boy2.png?';
const girl1 = 'http://byl0516.blissr.com.cn/girl1.png?';
const shareGirl1 = 'http://byl0516.blissr.com.cn/share-girl1.png?';
const girl2 = 'http://byl0516.blissr.com.cn/girl2.png?';
const shareGirl2 = 'http://byl0516.blissr.com.cn/share-girl2.png?';

@Controller()
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get()
  async root() {
    return 'Hi 白玉兰';
  }

  // 微信校验
  @Get('MP_verify_i81jI4DRd4D2xwG3.txt')
  async mp() {
    return 'i81jI4DRd4D2xwG3';
  }
  @Get('mp/MP_verify_i81jI4DRd4D2xwG3.txt')
  async mpVeri() {
    return 'i81jI4DRd4D2xwG3';
  }

  // 服务器初始化
  // @Post('init')
  // async init() {
  //   const setTotal = new Setting();
  //   setTotal.set('k', 'total');
  //   setTotal.set('v', '10');
  //   const setDaily = new Setting();
  //   setDaily.set('k', 'daily');
  //   setDaily.set('v', '3');
  //   const setJump = new Setting();
  //   setJump.set('k', 'jumpTo');
  //   setJump.set('v', 'http://byl0516.leanapp.cn/');
  //   const res = await AV.Object.saveAll([setTotal, setDaily, setJump]);
  //   console.log(res);
  //   return 'done';
  // }

  // 首页loading页面
  @Get('loading/:source')
  async loading(@Res() res, @Req() req, @Param() param) {
    if (param.source !== 'test') {
      await this.clientService.collectUa(req.headers['user-agent'], param.source);
    }
    res.render('loading');
  }

  @Get('loading')
  async loadingRedirect(@Res() res, @Req() req, @Param() param) {
    res.redirect('loading/web');
  }

  // 聊天页面
  @Get('chat')
  async chat(@Res() res){
    res.render('chat');
  }

  // 大礼包
  @Get('gift')
  async gift(@Res() res){
    res.render('gift');
  }

  // 填写表格
  @Get('form')
  testForm(@Res() res, @Query() query){
    // console.log(query);
    res.render('form', {
      gender: query.gender,
      type: query.type,
      error: '',
      name: '',
      phone: '',
    });
  }

  @Post('success')
  async share(@Res() res, @Body() body){
    console.log(body);
    const availableStatus: any = await this.clientService.checkFormAvailable(body);
    /* success - Type
      0. 今天已领过礼物
      1: 成功大包
      2: 成功领取饮料券
    */
    console.log(availableStatus);
    const feedback = false;
    if (availableStatus.error !== '' ){
      console.log('wrong');
      res.render('form', availableStatus);
    } else {
      console.log('next');
      // return true;
      // res.render('success', 1);
      const hasGotBag = await this.clientService.checkIsFirst(body.phone);
      if (hasGotBag){
        const ifGotAnything = await this.clientService.isGotToday(body.phone);
        // console.log(ifGotDrink);
        if (!ifGotAnything) {
          console.log('今天没领过');
          // 今天没领过
          const hasGift = await this.clientService.hasGift();
          if (hasGift) {
            console.log('今天有礼物');
            // feedback = await this.clientService.sendMessageToUser(body.phone, 'bag', body.pick.split(' ')[0], body.pick.split(' ')[1]);
            body.SMSState = feedback;
            await this.clientService.saveLuckDog(body, 'bag');
            res.render('success', {
              status: 1,
              name: body.name,
              gender: body.gender,
            });
          } else {
            console.log('今天没礼物');
            // 是否连续三天来
            const isSerial = await this.clientService.checkIsSerial(body.phone);
            if (isSerial) {
              console.log('连续3天来');
              // feedback = await this.clientService.sendMessageToUser(body.phone, 'bag', body.pick.split(' ')[0], body.pick.split(' ')[1]);
              body.SMSState = feedback;
              await this.clientService.saveLuckDog(body, 'bag');
              res.render('success', {
                status: 1,
                name: body.name,
                gender: body.gender,
              });
            } else {
              console.log('没礼物没, 没三天, 拿饮料');
              // 今天没拿过饮料
              // feedback = await this.clientService.sendMessageToUser(body.phone,
              // 'ticket', body.pick.split(' ')[0], body.pick.split(' ')[1]);
              body.SMSState = feedback;
              await this.clientService.saveLuckDog(body, 'ticket');
              res.render('success', {
                status: 2,
                name: body.name,
                gender: body.gender,
              });
            }
          }
        } else {
          res.render('success', {
            status: 0,
            name: body.name,
            gender: body.gender,
          });
        }

      } else {
        res.render('success', {
          status: 0,
          name: body.name,
          gender: body.gender,
        });
      }
      // await this.clientService.saveLuckDog(body, 'ticket');
      // await this.clientService.sendMessageToUser(body.phone, type, body.pick.split(' ')[0], body.pick.split(' ')[1]);
    }
  }
  @Get('success')
  shareIn(@Res() res) {
    res.redirect('/loading/pageshare');
  }

  @Get('drink')
  getDrink(@Res() res) {
    // const feedback = await this.clientService.sendMessageToUser(body.phone,
    // 'ticket', body.pick.split(' ')[0], body.pick.split(' ')[1]);
    // body.SMSState = feedback;
    // await this.clientService.saveLuckDog(body, 'ticket');
    const shareItem = this.clientService.formatShareItem('girl', '唐浩翔');
    console.log(shareItem);
    res.render('share', {
      shareItem,
    });
  }

  // operation
  @Get('jump')
  async jump(@Res() res, @Req() req) {
    const jumpTo = await this.clientService.querySetting('jumpTo');
    const ua = req.headers['user-agent'];
    await this.clientService.jumpToGoldMaster(ua);
    res.redirect(jumpTo);
  }

  // test
  @Get('success/:status')
  testSuccess(@Res() res, @Param() param) {
    res.render('success', {
      status: parseInt(param.status, 10),
    });
    // res.render('/share', {
    //   status: 1,
    // });
  }
  // test
@Get('share')
shareItem(@Res() res, @Query() query) {
  const shareItem = this.clientService.formatShareItem(query.gender, query.name);
  console.log(shareItem);
  res.render('share', {
    shareItem,
    name: query.name,
    gender: query.gender,
  });
    // res.render('/share', {
    //   status: 1,
    // });
  }

@Get('test')
  async test(@Req() req) {
  //   const options = {
  //     method: 'GET',
  //     uri: 'https://www.easy-mock.com/mock/5b02ebfa6c3270356c903720/example/query',
  // };
  //   const res = await rp(options);

    // console.log(res.headers);
    console.log(req.headers);
    // console.log(req.headers['x-real-ip']);
    return req.headers;
  }
  // @Get('test/1')
  // async testGet(@Req() req) {
  //   let uri = 'http://wxcj.jj-inn.com/api/ActivityApi/JJSendMsg?';
  //   // const ip = req.headers['x-real-ip'] ? req.headers['x-real-ip'] : req.ip.replace(/::ffff:/, '');
  //   console.log(req.headers);
  //   try {
  //     uri += 'tel=18721558772&content=';
  //     uri += encodeURIComponent('恭喜您成功预约领取“相约摩天轮 白享一夏白”大礼包，请在x月x日 xx：xx～xx：xx 本人前往虹梅路227号白玉兰上海锦江乐园酒店，出示本短信完成签到注册步骤后即可领取礼包。咨询热线：400-820-9999');
  //     uri += '&typecode=BYLHD';
  //     // uri = encodeURI(uri);
  //     // uri = encodeURIComponent(uri);
  //     const options = {
  //       method: 'GET',
  //       uri,
  //     };
  //     const r = await rp(options);
  //     console.log(r);
  //     return {
  //       r,
  //       uri,
  //       // req,
  //     };

  //   } catch (err) {
  //     return {
  //       uri,
  //       err,
  //       // req,
  //     };
  //   }
  // }
@Get('test/:id')
  async testPost(@Req() req, @Param() param) {
    // const uri = 'http://wxcj.jj-inn.com/api/ActivityApi/JJSendMsg?tel=18721558772&content=本人前往虹梅路227号白玉兰上海锦江乐园酒店&typecode=BYLHD';
    let uri = 'http://wxcj.jj-inn.com/api/ActivityApi/JJSendMsg?';
    uri += 'tel=18721558772&content=';
    uri += encodeURIComponent('恭喜您成功预约领取“相约摩天轮 白享一夏白”大礼包，请在x月x日 xx：xx～xx：xx 本人前往虹梅路227号白玉兰上海锦江乐园酒店，出示本短信完成签到注册步骤后即可领取礼包。咨询热线：400-820-9999');
    uri += '&typecode=BYLHD';
    // const uri = 'http://www.baidu.com/';
    try {
      if (param.id === '1'){
        const res = await rp({
          method: 'GET',
          uri,
          // headers: {
          //   'Content-Type': 'text/html',
          // },
        });
        return {
          res,
          uri,
        };
      }
  } catch (err) {
    return {
      uri,
      err,
    };
  }
  }
}
