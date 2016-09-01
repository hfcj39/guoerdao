/**
 * Created by bingpo on 2016/7/14.
 **/


var mongo = require('mongoskin');

var db = mongo.db('mongodb://root:188399@182.254.241.183:27017/hello?authSource=admin'
);
exports.db = db;

