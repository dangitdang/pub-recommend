var express = require('express');
var router = express.Router();
var raccoon = require('raccoon');
var config = require('../config.js');

raccoon.config = config;

raccoon.connect(process.env.REDIS_PORT,
    process.env.REDIS_URL,
    process.env.REDIS_AUTH)

/* /GET recommendation 

param: userID
query: recs - the number of recommendations
return: pubID recommended for the user
*/

router.get('/:user', function(req, res, next) {
    var userID = req.params.user;
    var requests = req.query.recs ? Number(req.query.recs) : 1
    raccoon.recommendFor(userID, Number(requests), function(results) {
    	console.log(results);
        res.json({
            recommendations: results
        });
    });
});

/* /POST user likes

params:
	user - the user's id
	action - like or dislike

query: 
	pub - the pub's id

return:
	Empty Json
*/

router.post('/:user/:action', function(req, res, next) {
    var userID = req.params.user,
        action = req.params.action,
        pubID = req.query.pub;
    console.log(action)
    if (action === 'liked' || action === 'disliked') {
        raccoon[action](userID, pubID, function() {
            res.json({});
        });

    } else {
        res.json({
            'error': 'Action not allowed'
        })

    }
})
module.exports = router;