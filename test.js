var request = require('request');


// request({
//   url : 'http://localhost:8000/signupEmployer',
//   method : 'POST',
//   json : true,
//   body : {username:'ashish',password:'ashish'}
// },function (err,res,body){
//   // console.log(err);
//   // console.log(res);
//   console.log(body);
// });


request({
  url : 'http://localhost:8000/signInEmployer',
  method : 'POST',
  json : true,
  body : {username:'ashish',password:'ashish'}
},function (err,res,body){
  // console.log(err);
  // console.log(res);
  console.log(body);
});
