var dbase = require('./dbase');
var jwtvar = require('./jwt');
var secret = require('./secretkey');
//const handlebars = require('express-handlebars');
const nodemailer = require('nodemailer');
const path = require('path');

const Cookies = require('universal-cookie');    

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const TWO_HOURS = 1000 * 60 * 60 * 2;
const jwt = require('jsonwebtoken');




const app = express();
const cookies = new Cookies();

// app.engine('handlebars',handlebars());
// app.set('view engines','handlebars'); 

app.use('/public',express.static(path.join(__dirname,'public')));
app.use(cors());
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(cookieParser());
app.use(session({ secret: "Shh, its a secret!", resave: false, saveUninitialized: true }));




app.post('/signup', (request, response) => {
    const data = request.body;
    var showme = 1;
    if (data.showme == false)
        showme = 0;
    var sql = `INSERT INTO register (mail_id, password,show_me) VALUES ('${data.email}','${data.password}','${showme}')`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
    });
});

app.post('/login', (request, response) => {
    request.session.name = request.body.email;
    const data = request.body;
    var sql = `SELECT uid,mail_id,password FROM register where  mail_id='${data.email}' AND password ='${data.password}'`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        else {
            if (result) {
                jwt.sign({ user: result }, secret, (err, token) => {
                    response.send({ "check": true, "id": result[0].uid, "name": result[0].mail_id, token: token });
                })
            }
            else
                response.send({ "check": false });
        }
    });
});

app.get('/logout', function (request, response) {
    request.session.destroy();
    response.send({ "check": true });
});


app.post('/acceptfriend', jwtvar.verifyToken, (request, response) => {
    const data = request.body;
    const authData = (jwtvar.verification(request, response));
    var sql = `INSERT INTO friend_table (uid,accept_id,email,accept_email) VALUES ('${authData.user[0].uid}','${data.accept_id}','${authData.user[0].mail_id}','${data.accept_email}')`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
    });
    var sql = `UPDATE friend_request SET status = 'accepted' where from_uid='${data.accept_id}' and to_uid ='${authData.user[0].uid}'`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        response.send(result);
    });
});

app.get('/', function (request, response) {
    response.send("backend is running ****");
});

app.post('/rejectfriend', jwtvar.verifyToken, (request, response) => {
    const data = request.body;
    const authData = (jwtvar.verification(request, response));
    var sql = `DELETE from friend_request where from_uid='${data.accept_id}' and to_uid ='${authData.user[0].uid}'`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        response.send(result)
    });
});


app.post('/postItem', jwtvar.verifyToken, (request, response) => {
    const data = request.body;
    const authData = (jwtvar.verification(request, response));
    var sql = `INSERT INTO post_table (uid,post_content,post_by,likes,photo) VALUES ('${authData.user[0].uid}','${data.postItem}','${authData.user[0].mail_id}',0,'${data.postPicture}')`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
    });
});

app.post('/addImage', jwtvar.verifyToken, (request, response) => {
    const data = request.body;
    // console.log("image url:",data.imageURL)
    const authData = (jwtvar.verification(request, response));
    var sql = `UPDATE register set profile_pic='${data.imageURL}' where mail_id='${authData.user[0].mail_id}'`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
    });
});

app.get('/getImage', jwtvar.verifyToken, (request, response) => {
    const authData = (jwtvar.verification(request, response));
    var sql = `SELECT profile_pic from register where mail_id='${authData.user[0].mail_id}'`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        response.send(result);
    });
});



app.get('/timelinePost', (request, response) => {
    var sql = `SELECT * FROM post_table`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        response.send(result);
    });
});

app.post('/wall', (request, response) => {
    var data = request.body;
    var sql = `SELECT * FROM post_table where post_by='${data.mail}'`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        response.send(result);
    });
});

app.post('/friendRequest', jwtvar.verifyToken, (request, response) => {
    const data = request.body;
    const authData = (jwtvar.verification(request, response));
    var sql = `INSERT INTO friend_request (from_email,to_email,status,from_uid,to_uid) values ('${authData.user[0].mail_id}','${data.to}','pending','${authData.user[0].uid}','${data.to_uid}')`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        response.send(result);
    });
    const output = `<h3> YOU RECIEVED A FRIEND REQUEST FROM ${authData.user[0].mail_id}</h3>`;
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        service : 'gmail',
        port: 465,
        secure: true, 
        auth: {
          user: '[YOUR EMAIL ID]', 
          pass: '[YOUR PASSWORD]'
        },
        tls:{
            rejectUnauthorized:false,
        }
      });

      let mailOptions = {
        from: `${authData.user[0].mail_id}`, 
        to: `${data.to}`,
        subject: "Friend Request",
        text: "Hai  .. Add me as a friend !", 
        html: output 
      };

      transporter.sendMail(mailOptions , (error , info ) => 
      {
        if(error)
            console.log("error:",error);
      })
});


app.get('/find', jwtvar.verifyToken, (request, response) => {
    const authData = (jwtvar.verification(request, response));
    var qq = `select * from register where mail_id != '${authData.user[0].mail_id}' and show_me = 1 and (mail_id not in (select to_email from friend_request where from_email='${authData.user[0].mail_id}' UNION select from_email from friend_request where to_email='${authData.user[0].mail_id}'))`;
    dbase.query(qq, function (err, users) {
        if (err) throw err;
        response.send(users);
    });
});

app.post('/sentrequest', jwtvar.verifyToken, (request, response) => {
    const authData = (jwtvar.verification(request, response));
    var qq = `select to_email from friend_request where from_email = '${authData.user[0].mail_id}' and status='pending'`;
    dbase.query(qq, function (err, users) {
        if (err) throw err;
        response.send(users);
    });
});


app.post('/getfriendrequest', jwtvar.verifyToken, (request, response) => {
    const authData = (jwtvar.verification(request, response));
    var sql = `SELECT from_email,from_uid from friend_request where to_uid = '${authData.user[0].uid}' and status = 'pending'`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        response.send(result);
    });

});

app.get('/ourfriends', jwtvar.verifyToken, (request, response) => {
    const authData = (jwtvar.verification(request, response));
    var sql = `SELECT email from friend_table where accept_email='${authData.user[0].mail_id}' union select accept_email from friend_table where email='${authData.user[0].mail_id}'`;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        response.send(result);
    });
});
    

app.post('/searchFriend', jwtvar.verifyToken, (request, response) => {
    const data = request.body;
    const authData = (jwtvar.verification(request, response));
    var qq = `select * from register where mail_id != '${authData.user[0].mail_id}' and show_me = 1 and mail_id like '%${data.searchitem}%' and (mail_id not in (select to_email from friend_request where from_email='${authData.user[0].mail_id}' UNION select from_email from friend_request where to_email='${authData.user[0].mail_id}')) `;
    dbase.query(qq, function (err, result) {
        if (err) throw err;
        response.send(result);
    });

});

app.post('/addlike', (request, response) => {
    const data = request.body;
    var sql = `select * from like_table where post_id = '${data.post_id}' and liked_by_uid ='${data.liked_by_uid}' `;
    dbase.query(sql, function (err, result) {
        if (err) throw err;
        if (result.length > 0) {
            var unlike = `delete from like_table where  post_id = '${data.post_id}' and liked_by_uid ='${data.liked_by_uid}' `;
            dbase.query(unlike, function (err, unlikeResult) {
                if (err) throw err;
                response.send(unlikeResult);

            });
            var updatelike = `update post_table set likes = post_table.likes-1 where post_id = '${data.post_id}'`;
            dbase.query(updatelike, function (err, updatelikeresult) {
                if (err) throw err;
            });
        }
        else {
            var like = `insert into like_table (post_id,liked_by_uid) values ('${data.post_id}','${data.liked_by_uid}') `;
            dbase.query(like, function (err, likeResult) {
                if (err) throw err;
                response.send(likeResult);
            });

            var updatelike = `update post_table set likes = post_table.likes+1 where post_id = '${data.post_id}'`;
            dbase.query(updatelike, function (err, updatelikeresult) {
                if (err) throw err;
            });
        }
    });

});

app.post("/likelist", (request, response) => {
    const data = request.body;
    var likelist = `select mail_id from register where uid in (select liked_by_uid from like_table where post_id = '${data.post_id}')`;
    dbase.query(likelist, function (err, result) {
        if (err) throw err;
        response.send(result);
    });
});


app.listen(8082);