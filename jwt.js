const jwt = require('jsonwebtoken');
const secret = require ('./secretkey');

const verifyToken =(req,res,next) =>
{
    const bearerHeader = req.headers['auth'];
    
    if(typeof bearerHeader !== 'undefined')
    {
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    }
    else
    {
        res.json({message : "forbiiden error" })
    }
}

const verification = (req,res) =>
{
    
let returndata ;

jwt.verify( req.token , secret , (err,authData)  =>
{
    if(err)
        returndata=err;
    else
        returndata = authData;
})
return returndata;

}

module.exports = {
    verifyToken,
    verification
}