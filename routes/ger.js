var router = require('express').Router();
var utils = require('../utils/recs.js');

/*

*/
router.post('/:journal', function(req, res, next) {
    var journalId = req.params.journal,
        action = req.body.action,
        pubId = req.body.pub,
        user = req.body.user;
    utils.inputAction(journalId, user, pubId, action)
        .then(function(error){
          if (!error){
            res.sendStatus(200);
          }
        }, function(containedAction){
          res.sendStatus(200);
        });
});


router.get('/:journal', function(req, res, next){
	var journalId = req.params.journal,
		user = req.query.user;
  utils.getRecommendations(journalId, user)
      .then(function(recs){
        res.json({
          recommendations : recs
        });
      }, function(err){
        res.json({
          error : err
        });
      });
});

router.delete('/:journal', function(req,res,next){
  var journalId = req.params.journal,
      user = req.body.user,
      pubId = req.body.pub,
      action = req.body.action;
  if (!user && !pubId && action){
    res.json({
      error: 'Missing user, pub, or action'
    });
  }
  utils.deleteAction(journalId, user, pubId, action)
    .then(function(result){
      if (!result.err){
        res.sendStatus(200);
      }
    });
});




module.exports = router;
