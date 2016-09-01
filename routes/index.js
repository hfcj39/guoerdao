var express = require('express');
var jwt = require('jwt-simple');
var router = express.Router();
//var cookie = require('cookie');
var request = require('request');
var bodyParser = require('body-parser');
var app = express();
var moment = require('moment');
var db = require('../db').db;
//var Bmob = require('../bmob');
//var alidayu = require('alidayu-node');
var AlipayNotify = require('../node_modules/alipay/lib/alipay_notify.class').AlipayNotify;
var AlipaySubmit = require('../node_modules/alipay/lib/alipay_submit.class').AlipaySubmit;
/***************************************************************************************************************************/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
/***************************************************************************************************************************/
/*生成Token*/
function ctoken(name) {
    var expires = moment().add(14, 'days').unix();
    var token = jwt.encode({
        sub: name,
        iat: moment().unix(),
        exp: expires
    }, 'jwtTokenSecret');
    return token;
}
/***************************************************************************************************************************/
/*验证token*/
function ensureAuthenticated(req, res, next) {
    if (!req.header('Authorization')) {
        return res.status(200).send({ err: '没有Token' });
    }
    var token = req.header('Authorization').split(' ')[1];

    var payload = null;
    try {
        payload = jwt.decode(token,'jwtTokenSecret');
    }
    catch (err) {
        return res.status(401).send({ err: '请重新登录' });
    }

    if (payload.exp <= moment().unix()) {
        return res.status(401).send({ err: 'Token has expired' });
    }
    req.username = payload.sub;
    next();
}
/***************************************************************************************************************************/

/***************************************************************************************************************************/
/*获取地区*/
router.route('/getarea').get(function (req,res) {
    db.collection('region').find().toArray(function (err,rst) {
        if (err){return res.status(401).send({ err: err });}
        else {
            res.send(rst);
        }
    })
});
/***************************************************************************************************************************/
/* GET home page. */
router.route('/')
    .post(function (req, res, next) {
    //res.render('index', {title: 'Express'});
        db.collection('fruit').find({
            school:req.body.name
        }).toArray(function (err,rst) {
            //console.log(rst);
            if (err){return res.status(401).send({ err: err });}
            else {
                res.send(rst);
            }
        });
        db.close();
});
/***************************************************************************************************************************/
/*get img*/
router.route('/getimg').get(function (req,res) {
    db.collection('play').find().toArray(function (err,rst) {
        if (err){res.send({err:err})}
        else {
            res.send(rst)
        }
    })
});
/***************************************************************************************************************************/
/*详情页*/
router.route('/detail')
    .post(function (req,res,next) {
        db.collection('fruit').find({
            "id" : req.body.id
        }).toArray(function (err,rst) {
            if(err || !rst.length){
                return res.status(401).send({ err: err });
            }else {
                res.send(rst[0]);
            }
        })
    });

/***************************************************************************************************************************/
/*发送短信*/
router.route('/sendmsg')
    .post(function (req,res) {
            var options = {
                url: 'https://api.bmob.cn/1/requestSmsCode',
                method:'POST',
                headers: {
                    'X-Bmob-Application-Id':'3b48d8209292c66c37534c51bf29ddff',
                    'X-Bmob-REST-API-Key':'26af596c458f224e57835657fc5f0316',
                    'Content-Type': 'application/json'
                },
                body: '{"mobilePhoneNumber":'+'"'+req.body.username+'","template":"果儿岛"}'

            };
            //console.log(typeof req.body.username);
            request(options,function(error, response) {
                if (!error && response.statusCode == 200) {
                    res.send('ok');
                    //return true;
                }else{
                    console.log(response);
                    console.log('手机号'+req.body.username);
                    res.status(401).send({err:'发送失败，请检查手机号'});
                }
            });
        }
    );


/***************************************************************************************************************************/
/*验证短信*/
function checkmessage(req,res,next) {
    var options = {
        url: 'https://api.bmob.cn/1/verifySmsCode/'+req.body.code,
        method:'POST',
        headers: {
            'X-Bmob-Application-Id': '3b48d8209292c66c37534c51bf29ddff',
            'X-Bmob-REST-API-Key': '26af596c458f224e57835657fc5f0316',
            'Content-Type': 'application/json'
        },
        body:'{"mobilePhoneNumber":'+'"'+req.body.username+'"}'
    };
    function callback(error, response) {
        if (!error && response.statusCode == 200) {
            //console.log(response);
            next();
        }else{
            return res.status(401).send({err:'验证码错误'});
        }
    }
    request(options, callback);
}
/***************************************************************************************************************************/
/*验证登录返回Token*/
router.route('/login')
    .post(function (req, res, next) {
        db.collection('hello').find({
            username: req.body.username,
            password: req.body.password
        }).toArray(function (err, rst) {
            if (err || !rst.length) {
                res.status(401);
                res.send({err: err && err.message ? err.message : '账号或密码有误'});
            //next(err || new Error("账号或密码有误"));
            }else {
                var token = ctoken(req.body.username);
            //res.json({user:rst[0],token:token});
                res.send({token: token});}
        });
        db.close();

});
/***************************************************************************************************************************/
/*注册*/
router.route('/signup')
    .post(checkmessage,function(req, res) {
        db.collection('hello').findOne({ username: req.body.username }, function(err, existingUser) {
            if (existingUser) {
                return res.status(401).send({ err: '账号已存在' });
            }else
            if(!req.body.username){
                return res.status(401).send({err:'username is null'});
            }else {

                var user ={
                    username: req.body.username,
                    password: req.body.password,
                    sex:req.body.sex
                };
                db.collection('hello').insert(user,function(err, result) {
                    if (err) {
                        res.status(401).send({ err: err.message });
                    }
                    res.send({token: ctoken(req.body.username)});
                });
            }

        });
        db.close();
    });
/***************************************************************************************************************************/
/*重置密码*/
router.route('/findpass').post(checkmessage,function (req,res) {
    db.collection('hello').update({
        username:req.body.username
    },{$set:{password:req.body.password}},function (err,rst) {
        if (err || !rst){
            res.status(401).send({err:err})
        }else {
            res.send('ok')
        }
    })
});
/***************************************************************************************************************************/
/*收获地址*/
router.route('/address').get(ensureAuthenticated,function (req,res) {
    db.collection('address').find({
        username:req.username
    }).toArray(function (err,rst) {
        if (err || !rst.length){
            res.status(200);
            res.send('您还没有添加收获地址');
        }else {
            res.send(rst);
        }
    });
    db.close();
});
/***************************************************************************************************************************/
/***************************************************************************************************************************/
/*修改地址*/
router.route('/editaddress').post(ensureAuthenticated,function (req,res) {
    if (req.body._id == -1){

        var address = {
            username:req.username,
            name:req.body.name,
            address:req.body.address,
            phone:req.body.phone,
            default:0
        };
        db.collection('address').insert(address,function (err,rst) {
            if(err){res.status(401).send({err:err});}
            else{
                //console.log(rst);
                res.send(rst);
            }
        });
        db.collection('address').find({username:req.username}).toArray(function (err,rst) {
            if (rst.length == 1){
                db.collection('address').update({username:req.username,default:0},{$set:{default:1}})
            }
        })
    }else{
        if (req.body.default == 1){
            db.collection('address').update({username:req.username,default:1},{$set:{default:0}})
        }
        db.collection('address').updateById(req.body._id,{
            username:req.username,
            name:req.body.name,
            address:req.body.address,
            phone:req.body.phone,
            default:req.body.default
        },function (err,rst) {
            if (err){res.status(401).send({err:err});}
            else {
                res.send(rst);
            }
        })
    }
    db.close();
});
/***************************************************************************************************************************/
/*删除地址*/
router.route('/deleteaddress').post(ensureAuthenticated,function (req,res) {
    db.collection('address').findById(req.body._id,function (err,rst) {
        if(rst.default == 1){
            db.collection('address').findOne({username:req.username,default:0},function (err,rst) {
                db.collection('address').updateById(rst._id,{$set:{default:1}})
            });
        }
    });
    db.collection('address').removeById(req.body._id,function (err,rst) {
        if(err){res.sendStatus(401);
            res.send({err:err});
            }
        else {
            //console.log(rst);
            res.sendStatus(200);
        }
    });

});
/***************************************************************************************************************************/
function ensure(req,res,next) {
    var arraylength = req.body.cartFruits.length;
    flag = 0;
    var lock = 0;
    var isSend = false;
    for (var i=0;i<arraylength;i++){
        var n_id=req.body.cartFruits[i]._id;
        var amount_buy = req.body.cartFruits[i].buyAmount;
//console.log(amount_buy);
        (function(n_id,amount_buy){
            db.collection('fruit').findById(req.body.cartFruits[i]._id,function (err,rst) {
                //console.log(rst.limit_fruit);
                if(err || !rst){
                    flag = 1;
                    if(!isSend){
                        res.status(401).send({err:'没有查到所选水果'});
                        isSend = true;
                    }
                    lock++;
                }else if (amount_buy > rst.amount){
                    flag = 1;
                    if (!isSend){
                        res.status(401).send({err:'库存不足'});
                        isSend = true;
                    }
                }
                else if (rst.limit_fruit !=0 && rst.limit_fruit != null && amount_buy > rst.limit_fruit){

                        flag = 1;
                        if (!isSend){
                            res.status(401).send({err:'超出每单限购数量'});
                            isSend = true;
                        }


                }
                else{
                    var limit =  rst.buyLimit;
                    //console.log(rst.buyLimit)
                    if (limit != 0 && limit != null){
                        db.collection('order').find({"user":req.username,"cartFruits._id":n_id,"ispay":1})
                            .toArray(function (err,rst) {
                                lock++;
                            //console.log(lock);
                            //console.info(rst);
                            if (rst.length >= limit){
                                flag = 1;
                                if(!isSend){
                                    res.status(401).send({err:"您已购买达到订单限购次数"});
                                    isSend = true;
                                }
                            }else{
                                //console.log('lock'+lock+'flag'+flag);
                                if(lock == arraylength && flag != 1){
                                    //console.log('next');
                                    next();
                                }
                            }
                        })

                    } else {

                        if (lock == arraylength-1 && flag != 1){
                            //console.log('next');
                            next();
                        }
                        lock++;
                    }
                }

            });
        })(n_id,amount_buy);

    }
}
/***************************************************************************************************************************/
/*order*/
router.route('/order').post(ensureAuthenticated,ensure,function (req,res) {
    /*验证限购*/


    //计算总金额,检查库存，检查学校
    var arraylength = req.body.cartFruits.length;
    var tprice=0;
    var price = 0;
    var lock = 0;
    var lck=0;
    for (var i=0;i<arraylength;i++){

        var buyamount = parseFloat(req.body.cartFruits[i].buyAmount);
        (function (buyamount) {
            db.collection('fruit').findById(req.body.cartFruits[i]._id,function (err,rst) {
                //while (lck){}
                //lck=1;
                price= parseFloat(rst.discountPrice);
                //console.log(i+buyamount);
                tprice = parseFloat(tprice) + (price * buyamount);
                console.info(lock,tprice);
                lock++;
                console.log('arraylength'+arraylength);
                console.log('lock'+lock);
                if (lock==arraylength){
                    //return callback(null,tprice)
                    var a = moment().format('YYYYMMDDHHmmss');
                    //var b = req.body.selectedAddress.username;
                    var b = req.username;
                    var oid = a+b;
                    var time = moment().format('YYYY-MM-DD');
                    var finalorder = {
                        orderid:oid,
                        date:time,
                        totalprice:tprice,
                        ispay:0,
                        user:req.username,
                        complete:0,
                        school : req.body.school,
                        cartFruits : req.body.cartFruits,
                        deliverWay : req.body.deliverWay,
                        selectedAddress : req.body.selectedAddress
                    };
                    db.collection('order').insert(finalorder,function (err,rst) {
                        if(!err){
                            /*request.post('http://123.206.203.130/alipay/alipayapi.php', {form:{
                                WIDout_trade_no:oid,
                                WIDsubject:'果儿岛水果',
                                WIDtotal_fee:tprice,
                                WIDshow_url:'',
                                WIDbody:''
                            }},function (error,response) {
                                if (!error && response.statusCode == 200) {
                                    res.send(response.body);
                                    //console.log(options);
                                    //console.log(response);
                                }
                            });*/
                            /*****************************************************/
                            var alipay_config={
                                partner:'2088421676961963',
                                seller_id:'2088421676961963',
                                key:'23v6g77mdtepwe7h28mtfg9lm0r2y1q3',
                                notify_url:'http://123.206.203.130:3000/notify',
                                return_url:'http://123.206.203.130',
                                sign_type:'MD5'.toUpperCase(),
                                input_charset:'utf-8'.toLowerCase(),
                                cacert:process.cwd()+'/cacert.pem',
                                transport:'https',
                                payment_type:'1',
                                service:'alipay.wap.create.direct.pay.by.user'
                            };
                            //console.log(req.body);
                            var parameter = {
                                "service" : alipay_config['service'],
                                "partner" : alipay_config['partner'],
                                "seller_id" : alipay_config['seller_id'],
                                "payment_type" : alipay_config['payment_type'],
                                "notify_url" : alipay_config['notify_url'],
                                "return_url" : alipay_config['return_url'],
                                "_input_charset" : alipay_config['input_charset'],
                                "out_trade_no" : oid,
                                "subject" : '果儿岛水果',
                                "total_fee" : tprice,
                                "show_url" : '',
                                //"app_pay" : "Y",//启用此参数能唤起钱包APP支付宝
                                "body" : ''
                            };
                            var alipaySubmit = new AlipaySubmit(alipay_config);
                            var html_text = alipaySubmit.buildRequestForm(parameter,"get","确认");
                            res.send(html_text);
                            /*****************************************************/
                        }
                    });
                    //请求支付宝

                }
                //lck=0;
            });
        })(buyamount);


    }
    //console.log(tprice);

/*
    for (var x=0;x<arraylength;x++){
        var amount_buy=req.body.cartFruits[x].buyAmount;
        var nid = req.body.cartFruits[x]._id;
        (function (amount_buy,nid) {
            db.collection('fruit').findById(req.body.cartFruits[x]._id,function (err,rst) {
                var amount_old=rst.amount;
                var amount_now=parseInt(amount_old) - parseInt(amount_buy);
                var opt = {
                    $set:{amount:amount_now}
                };
                db.collection('fruit').updateById(nid,opt)
            });
        })(amount_buy,nid);



    }
    
*/
});

router.route('/return').get(function (req,res) {
    if(req.query.is_success=='T'){
        db.collection('order').update({orderid:req.query.out_trade_no},{$set:{ispay:1}},function (err,rst) {
            if(!err){
                var html = '<!DOCTYPE html><html><a href=http://www.guoerdao.com/>支付成功，点击回到首页</a><script>windows.location.href="http://123.206.203.130/"<script></html>';
                res.send(html)
            }else{
                res.send(err)
            }
        });
    }
});



router.route('/notify').post(function (req,res) {
    //console.log('alipaynotify');
    //var v_res = alinotify.AlipayNotify.verifyNotify();
    var alipay_config={
        partner:'2088421676961963',
        seller_id:'2088421676961963',
        key:'23v6g77mdtepwe7h28mtfg9lm0r2y1q3',
        notify_url:'http://123.206.203.130:3000/notify',
        return_url:'http://123.206.203.130',
        sign_type:'MD5'.toUpperCase(),
        input_charset:'utf-8'.toLowerCase(),
        cacert:process.cwd()+'/cacert.pem',
        transport:'https',
        payment_type:'1',
        service:'alipay.wap.create.direct.pay.by.user'
    };
    //console.log(req.body);
    var alipayNotify = new AlipayNotify(alipay_config);
    alipayNotify.verifyNotify(req.body,function (verify_result) {
        //console.log(verify_result);
        if(verify_result){
            db.collection('order').find({orderid:req.body.out_trade_no}).toArray(function (err,rst) {
                if (!err){
                    console.log(rst[0].cartFruits);
                    var arraylength = rst[0].cartFruits.length;
                    for (var i=0;i<arraylength;i++){
                        var amount_buy=rst[0].cartFruits[i].buyAmount;
                        var nid = rst[0].cartFruits[i]._id;
                        (function (amount_buy,nid) {
                            db.collection('fruit').findById(rst[0].cartFruits[i]._id,function (err,rst) {
                                var amount_old=rst.amount;
                                var amount_now=parseInt(amount_old) - parseInt(amount_buy);
                                var opt = {
                                    $set:{amount:amount_now}
                                };
                                db.collection('fruit').updateById(nid,opt)
                            });
                        })(amount_buy,nid);


                    }
                }
            });

            db.collection('order').update({orderid:req.body.out_trade_no},{$set:{ispay:1}},function (err,rst) {
                if(!err){
                    console.log('notify');
                    res.send('success')
                }
            });
        }else {
            res.send('fail')
        }
    });
    
    //console.log(verify_result);


});

/***************************************************************************************************************************/
/*getorder*/

router.route('/getorder').get(ensureAuthenticated,function (req,res) {
    db.collection('order').find({user:req.username}).toArray(function (err,rst) {
        if(err){
            res.status(401).send({err:err})
        }else {
            res.send(rst)
        }
    })
});

/***************************************************************************************************************************/
router.route('/tst').post(function (req,res) {
    var alipay_config={
        partner:'2088421676961963',
        seller_id:'2088421676961963',
        key:'23v6g77mdtepwe7h28mtfg9lm0r2y1q3',
        notify_id:'http://123.206.203.130:3000/notify',
        return_url:'http://123.206.203.130',
        sign_type:'MD5'.toUpperCase(),
        input_charset:'utf-8'.toLowerCase(),
        cacert:process.cwd()+'/cacert.pem',
        transport:'https',
        payment_type:'1',
        service:'alipay.wap.create.direct.pay.by.user'
    };
    //console.log(req.body);
    var parameter = {
        "service" : alipay_config['service'],
        "partner" : alipay_config['partner'],
        "seller_id" : alipay_config['seller_id'],
        "payment_type" : alipay_config['payment_type'],
        "notify_url" : alipay_config['notify_url'],
        "return_url" : alipay_config['return_url'],
        "_input_charset" : alipay_config['input_charset'],
        "out_trade_no" : req.body.out_trade_no,
        "subject" : req.body.subject,
        "total_fee" : req.body.total_fee,
        "show_url" : req.body.show_url,
        //"app_pay" : "Y",//启用此参数能唤起钱包APP支付宝
        "body" : req.body.body
        };
    var alipaySubmit = new AlipaySubmit(alipay_config);
    var html_text = alipaySubmit.buildRequestForm(parameter,"get","确认");
    res.send(html_text)

});
/***************************************************************************************************************************/

module.exports = router;
/***************************************************************************************************************************/