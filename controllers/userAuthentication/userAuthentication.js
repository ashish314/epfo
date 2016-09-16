/*
  How passport authentication works.
  1. see the require statements and middlewares to use (has to be in same order).
  2. passport has a method authenticate which when called passes the pointer to
     the method where you has implemented a strategy (local in this case).
  3. serialize is to set what needs to stored in session (not whole user object).
  4. deserialize is for subsequent requests, it takes whatever in session and
     fetches data to be placed in req.user.
  5. for storing session in redis use redis store, it requires a running redis client
      and should be instructed to express-session middleware. 
*/
var _             = require('lodash'),
    APP           = require(__dirname + '/../../app.js'),
    passport      = require('passport'),      // required for local authentication.
    LocalStrategy = require('passport-local').Strategy,
    session       = require('express-session'),
    redisClient   = require(__dirname + '/../redis.js')(),
    RedisStore    = require('connect-redis')(session),
    mongoObj      = require(__dirname + '/../mongo.js')();
    sha1          = require('sha1');

APP.use(session({
    store             : new RedisStore({
      client : redisClient
    }),
    secret            : 'Dexter',
    cookie            : {},
    resave            : false,
    saveUninitialized : false
}));

APP.use(passport.initialize());
APP.use(passport.session());

passport.use(new LocalStrategy({
  usernameField : 'loginField',
  passwordField : 'password',
  passReqToCallback : true 
},function (req,loginField,password,done){
    // check for username and passowrd match.
    var obj = {};
    if(req.body.uid){
      obj['PARTNER'] = req.body.uid;
      obj['TYPE']    = String(req.body.type);
    }
    else if(req.body.legacy_number){
      obj['BPEXT'] = req.body.legacy_number;
      obj['TYPE']  = String(req.body.type); 
    }
    mongoObj.init()
    .then(function (){
      mongoObj.masterDataModel.findOne(obj,function (err,result){
        if(err){
          return done("Internal server error");
        }
        else if(_.isEmpty(result)){
          return done("no user found",false);
        }
        else {
          var pass = sha1(password);
          if(pass !== password){
            return done("password do not match",false);
          }
          else{
            return done(null,result);
          }
        }
      })
    });
}));


passport.serializeUser(function (user,done){
  // id should be encrypted
  return done(null,user.PARTNER);
});

passport.deserializeUser(function (uid,done){
  // if id is encrypted in serailize it must be decrypted here.
  mongoObj.masterDataModel.findOne({PARTNER : uid},function (err,user){
    if(err)
      return done(err);
    else{      
      return done(null,trimUserObject(user));
    }
  }); 
});

function trimUserObject(user){
  var requiredFields = ['_id','username'];
  var updatedUserObj = {};
  requiredFields.forEach(function (key){
    updatedUserObj[key] = user[key];
  });

  user = null;
  return updatedUserObj;
};
    
var autheticate = function (req,res,next,cb){
  passport.authenticate('local',function (err,user){
    if(err)
      return cb(err);
    // now log user in.
    req.login(user,function (err){
      if(err)
        return cb(err);

      cb(null,user);
    });
  })(req,res,next);
};


module.exports = exports = autheticate;

