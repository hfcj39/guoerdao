var express = require('express');
var jwt = require('jwt-simple');
var router = express.Router();
var request = require('request');
var bodyParser = require('body-parser');
var app = express();
var moment = require('moment');
var db = require('../db').db;
//var Bmob = require('../bmob');
//var alidayu = require('alidayu-node');
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
var fs = require('fs');
/***************************************************************************************************************************/
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
/***************************************************************************************************
 * 中间件
 **************************************************************************************************/
function ensureadmin(req,res,next){
  if (!req.header('Authorization')) {
    return res.status(200).send({ err: '请重新登录' });
  }
  var token = req.header('Authorization').split(' ')[1];

  var payload = null;
  try {
    payload = jwt.decode(token,'adminTokenSecret');
  }
  catch (err) {
    return res.status(401).send({ err: '请重新登录' });
  }

  if (payload.exp <= moment().unix()) {
    return res.status(401).send({ err: '请重新登录' });
  }
  req.username = payload.sub;
  next();
}
function admintoken(name) {
  var expires = moment().add(1, 'days').unix();
  var token = jwt.encode({
    sub: name,
    iat: moment().unix(),
    exp: expires
  }, 'adminTokenSecret');
  return token;
}

/***************************************************************************************************
 * 验证登录
 **************************************************************************************************/
router.route('/').post(
    function (req, res, next) {
      db.collection('admin').find({
        username: req.body.username,
        password: req.body.password
      }).toArray(function (err, rst) {
        if (err || !rst.length) {
          res.status(401);
          res.send({err: err && err.message ? err.message : '账号或密码有误'});
          //next(err || new Error("账号或密码有误"));
        }else {
          var token = admintoken(req.body.username);
          //res.json({user:rst[0],token:token});
          res.send({token: token});}
      });
      db.close();
    }
);
/***************************************************************************************************
 * fruit
 **************************************************************************************************/
router.route('/findfruit').get(ensureadmin,function (req,res) {
  db.collection('fruit').find().toArray(function (err,rst) {
    if(!err){
      res.send(rst)
    }
  })
});

router.route('/insertfruit').post(ensureadmin,function(req, res, next) {
  /*var str = req.body.description;
  var reg =/"/g;
  var r = str.replace(reg,'/"');*/
  var obj = {
    id:req.body.id,
    fruitName : req.body.fruitName,
    discountPrice: req.body.discountPrice,
    normalPrice: req.body.normalPrice,
    amount : req.body.amount,
    imgUrl : req.body.imgUrl,
    info: req.body.info,
    weight : req.body.weight,
    school : req.body.school,
    description : req.body.description,
    buyLimit:req.body.buyLimit,
    limit_fruit:req.body.limit_fruit
  };
  //console.log(obj);
  db.collection('fruit').insert(obj,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/updatefruit').post(ensureadmin,function (req,res) {
  /*var str = req.body.description;
  var reg =/"/g;
  var r = str.replace(reg,'/"');*/
  var opt = {
    id:req.body.id,
    fruitName : req.body.fruitName,
    discountPrice: req.body.discountPrice,
    normalPrice: req.body.normalPrice,
    amount : req.body.amount,
    imgUrl : req.body.imgUrl,
    info: req.body.info,
    weight : req.body.weight,
    school : req.body.school,
    description : req.body.description,
    buyLimit:req.body.buyLimit,
    limit_fruit:req.body.limit_fruit
  };
  db.collection('fruit').updateById(req.body._id,opt,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/deletefruit').post(ensureadmin,function (req,res) {
  db.collection('fruit').removeById(req.body._id,function (err,rst) {
    if (err){
      res.sendStatus(401);
      res.send({err:'删除失败'})
    }
    else {
      res.send('删除成功')
    }
  })
});

router.route('/uploadImg').post(ensureadmin,multipartMiddleware,function (req,res) {
  //console.log(req.files.file.path);

// 获得文件的临时路径
  var tmp_path = req.files.file.path;
  var newname = moment().format('YYYYMMDDHHmmss')+'.jpg';
  // 指定文件上传后的目录
  var target_path = './public/images/' + newname;
  // 移动文件
  fs.rename(tmp_path, target_path, function(err) {
    if (err) throw err;
    // 删除临时文件夹文件,
    fs.unlink(tmp_path, function() {
      if (err) throw err;
      res.send('/images/'+newname);
    });
  });
});
/***************************************************************************************************
 * hello
 **************************************************************************************************/
router.route('/findhello').get(ensureadmin,function (req,res) {
  db.collection('hello').find().toArray(function (err,rst) {
    if(!err){
      res.send(rst)
    }
  })
});

router.route('/inserthello').post(ensureadmin,function(req, res, next) {
  var user = {
    username:req.body.username,
    password:req.body.password,
    sex:req.body.sex
  };
  db.collection('hello').insert(user,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

/*用于修改用户密码*/
router.route('/updatehello').post(ensureadmin,function (req,res) {
  db.collection('hello').updateById(req.body._id,{$set:{username:req.body.username,password:req.body.password,sex:req.body.sex}},function (err,rst) {
    if (err){res.status(401).send({err:'操作失败'})}
    else {
      res.send(rst)
    }
  })
});

router.route('/deletehello').post(ensureadmin,function (req,res) {
  db.collection('hello').removeById(req.body._id,function (err,rst) {
    if (err){res.sendStatus(401);
      res.send({err:'删除失败'})}
    else {
      res.send('删除成功')
    }
  })
});

/***************************************************************************************************
 * address
 **************************************************************************************************/
router.route('/findaddress').get(ensureadmin,function (req,res) {
  db.collection('address').find().toArray(function (err,rst) {
    if(!err){
      res.send(rst)
    }
  })
});

router.route('/insertaddress').post(ensureadmin,function(req, res, next) {
  var obj = {
    address : req.body.address,
    default : req.body.default,
    name : req.body.name,
    phone : req.body.phone,
    username : req.body.username
  };
  db.collection('address').insert(obj,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/updateaddress').post(ensureadmin,function (req,res) {
  var opt = {
    address : req.body.address,
    default : req.body.default,
    name : req.body.name,
    phone : req.body.phone,
    username : req.body.username
  };
  db.collection('address').updateById(req.body._id,opt,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/deleteaddress').post(ensureadmin,function (req,res) {
  db.collection('address').removeById(req.body._id,function (err,rst) {
    if (err){
      res.sendStatus(401);
      res.send({err:'删除失败'})
    }
    else {
      res.send('删除成功')
    }
  })
});

/***************************************************************************************************
 * region
 **************************************************************************************************/
router.route('/findregion').get(ensureadmin,function (req,res) {
  db.collection('region').find().toArray(function (err,rst) {
    if(!err){
      res.send(rst)
    }
  })
});

router.route('/insertregion').post(ensureadmin,function(req, res, next) {
  var obj = {
    name : req.body.name,
    province : req.body.province,
    issend:req.body.issend,
    selfaddress:req.body.selfaddress
  };
  db.collection('region').insert(obj,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/updateregion').post(ensureadmin,function (req,res) {
  var opt = {
    name : req.body.name,
    province : req.body.province,
    issend:req.body.issend,
    selfaddress:req.body.selfaddress
  };
  db.collection('region').updateById(req.body._id,opt,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/deleteregion').post(ensureadmin,function (req,res) {
  db.collection('region').removeById(req.body._id,function (err,rst) {
    if (err){
      res.sendStatus(401);
      res.send({err:'删除失败'})
    }
    else {
      res.send('删除成功')
    }
  })
});
/***************************************************************************************************
 * play
 **************************************************************************************************/
router.route('/findplay').get(ensureadmin,function (req,res) {
  db.collection('play').find().toArray(function (err,rst) {
    if(!err){
      res.send(rst)
    }
  })
});

router.route('/insertplay').post(ensureadmin,function(req, res, next) {
  var obj = {
    id:req.body.id,
    imgUrl:req.body.imgUrl
  };
  db.collection('play').insert(obj,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/updateplay').post(ensureadmin,function (req,res) {
  var opt = {
    id:req.body.id,
    imgUrl:req.body.imgUrl
  };
  db.collection('play').updateById(req.body._id,opt,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/deleteplay').post(ensureadmin,function (req,res) {
  db.collection('play').removeById(req.body._id,function (err,rst) {
    if (err){
      res.sendStatus(401);
      res.send({err:'删除失败'})
    }
    else {
      res.send('删除成功')
    }
  })
});
/***************************************************************************************************
 * order
 **************************************************************************************************/
router.route('/findorder').get(ensureadmin,function (req,res) {
  db.collection('order').find().toArray(function (err,rst) {
    if(!err){
      res.send(rst)
    }
  })
});

router.route('/insertorder').post(ensureadmin,function(req, res, next) {
  var time = moment().format('YYYY-MM-DD');
  var obj = {
    orderid:req.body.orderid,
    date:time,
    totalprice:req.body.totalprice,
    ispay:req.body.ispay,
    user:req.body.user,
    complete:0,
    school : {
      _id : req.body.school._id,
      name : req.body.school.name,
      province : req.body.school.province,
      issend : req.body.school.issend,
      selfaddress : req.body.school.selfaddress
    },
    cartFruits : req.body.cartFruits,
    deliverWay : req.body.deliverWay,
    selectedAddress : req.body.selectedAddress
  };
  db.collection('order').insert(obj,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/updateorder').post(ensureadmin,function (req,res) {
  //var time = moment().format('YYYY-MM-DD');
  var opt = {$set:{
    orderid:req.body.orderid,
    date:req.body.date,
    totalprice:req.body.totalprice,
    ispay:req.body.ispay,
    user:req.body.user,
    complete:req.body.complete,
    school : req.body.school,
    cartFruits : req.body.cartFruits,
    deliverWay : req.body.deliverWay,
    selectedAddress : req.body.selectedAddress
  }};
  db.collection('order').updateById(req.body._id,opt,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

router.route('/deleteorder').post(ensureadmin,function (req,res) {
  db.collection('order').removeById(req.body._id,function (err,rst) {
    if (err){
      res.sendStatus(401);
      res.send({err:'删除失败'})
    }
    else {
      res.send('删除成功')
    }
  })
});

/***************************************************************************************************
 * staff
 **************************************************************************************************/
/*zhongjianjian*/
function stafftoken(name) {
  var expires = moment().add(1, 'days').unix();
  var token = jwt.encode({
    sub: name,
    iat: moment().unix(),
    exp: expires
  }, 'staffTokenSecret');
  return token;
}

function ensurestaff(req,res,next) {
  if (!req.header('Authorization')) {
    return res.status(200).send({ err: '请重新登录' });
  }
  var token = req.header('Authorization').split(' ')[1];

  var payload = null;
  try {
    payload = jwt.decode(token,'staffTokenSecret');
  }
  catch (err) {
    return res.status(401).send({ err: err.message });
  }

  if (payload.exp <= moment().unix()) {
    return res.status(401).send({ err: '请重新登录' });
  }
  req.username = payload.sub;
  next();
}

router.route('/login_staff').post(
    function (req, res, next) {
      db.collection('staff').find({
        username: req.body.username,
        password: req.body.password
      }).toArray(function (err, rst) {
        if (err || !rst.length) {
          res.status(401);
          res.send({err: err && err.message ? err.message : '账号或密码有误'});
          //next(err || new Error("账号或密码有误"));
        }else {
          var token = stafftoken(req.body.username);
          //res.json({user:rst[0],token:token});
          res.send({token: token});}
      });
      db.close();
    }
);

router.route('/findorder_staff').post(ensurestaff,function (req,res) {
  db.collection('order').find({
    user:req.body.user
  }).toArray(function (err,rst) {
    //console.log(rst);
    if (err){return res.status(401).send({ err: err });}
    else {
      res.send(rst);
    }
  });
  db.close();
});

router.route('/updateorder_staff').post(ensurestaff,function (req,res) {
  db.collection('order').update({orderid:req.body.orderid},{$set:{complete:req.body.complete}},function (err,rst) {
    if(!err){
      res.send('success')
    }
  });
});

/***************************************************************************************************
 * staff
 **************************************************************************************************/
router.route('/findstaff').get(ensureadmin,function (req,res) {
  db.collection('staff').find().toArray(function (err,rst) {
    if(!err){
      res.send(rst)
    }
  })
});

router.route('/insertstaff').post(ensureadmin,function(req, res) {
  var user = {
    username:req.body.username,
    password:req.body.password
  };
  db.collection('staff').insert(user,function (err,rst) {
    if (err){
      res.status(401).send({err:'添加失败'})
    }else {
      res.send(rst)
    }
  })
});

/*用于修改用户密码*/
router.route('/updatestaff').post(ensureadmin,function (req,res) {
  db.collection('staff').updateById(req.body._id,{$set:{username:req.body.username,password:req.body.password}},function (err,rst) {
    if (err){res.status(401).send({err:'操作失败'})}
    else {
      res.send(rst)
    }
  })
});

router.route('/deletestaff').post(ensureadmin,function (req,res) {
  db.collection('staff').removeById(req.body._id,function (err,rst) {
    if (err){res.sendStatus(401);
      res.send({err:'删除失败'})}
    else {
      res.send('删除成功')
    }
  })
});




router.route('/test').post(function (req,res) {
  //var str = req.body.description;
  //var reg =/"/g;
  //var r = str.replace(reg,'/"');
 /* console.log(req.body);
  console.log(req.body.cartFruits[0]._id);
  db.collection('fruit').findById(req.body.cartFruits[0]._id,function (err,rst) {
    if(err || !rst){
      return res.send({err:err})
    }else {
      //console.log(rst.buyLimit)
      var i = 0;
      db.collection('order').find({"cartFruits.id":req.body.cartFruits[i].id}).toArray(function (err,rst) {
        console.log(rst);
        console.log(rst.length)
      })
    }
  })


  /*var arraylength = req.body.cartFruits.length;
  for (var i=0;i<arraylength;i++){
    db.collection('fruit').findById(req.body.cartFruits[i]._id,function (err,rst) {
      if(err || !rst.length){
        return res.send({err:'没有查到所选水果'})
      }else {
        console.log(rst)
      }
    })
  }*/
  /*var options = {
    url:'http://127.0.0.1/alipay/alipayapi.php',
    method:'POST',
    heeaders:{'Content-Type':'application/x-www-form-urlencoded'},
    body:'WIDout_trade_no='+req.body.no+'&WIDsubject=果儿岛水果&WIDtotal_fee='+req.body.fee+'&WIDshow_url=&WIDbody='
  };*/
  /*
  request(options,function (error,response) {
    if (!error && response.statusCode == 200) {
      res.send(response.body);
      console.log(options);
      //console.log(response);
      //return true;
    }
  })
*/
  request.post('http://127.0.0.1/alipay/alipayapi.php', {form:{
    WIDout_trade_no:req.body.no,
    WIDsubject:'果儿岛水果',
    WIDtotal_fee:req.body.fee,
    WIDshow_url:'',
    WIDbody:''
  }},function (error,response) {
    if (!error && response.statusCode == 200) {
      res.send(response.body);
      //console.log(options);
      //console.log(response);
      //return true;
    }
  })
  });






module.exports = router;
