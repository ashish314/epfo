var _             = require('lodash'),
    APP           = require(__dirname + '/../../app.js'),
    passport      = require('passport'),      // required for local authentication.
    LocalStrategy = require('passport-local').Strategy,
    session       = require('express-session'),
    redisClient   = require(__dirname + '/../redis.js')(),
    RedisStore    = require('connect-redis')(session),
    mongoObj      = require(__dirname + '/../mongo.js')();

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
  usernameField : 'username',
  passwordField : 'password' 
},function (username,password,done){
  // check for username and passowrd match.
    mongoObj.init()
    .then(function (){
      mongoObj.masterDataModel.findOne({username : username},function (err,result){
        if(err){
          return done("Internal server error");
        }
        else if(_.isEmpty(result)){
          return done(null,false,{message:"no user found"});
        }
        else {
          // decrpt password if required.
          var decrptPassword = password;
          if(decrptPassword !== password){
            return done(null,false,{message:"password do not match"});
          }
          else{
            return done(null,result);
          }
        }
      })
    });
}));


passport.serializeUser(function (user,done){
  return done(null,user._id);
});

passport.deserializeUser(function (userId,done){
  mongoObj.masterDataModel.findOne({_id : userId},function (err,user){
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

