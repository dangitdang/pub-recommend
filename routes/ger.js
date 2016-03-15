var router = require('express').Router();
var utils = require('../utils/recs.js');

/*

*/
router.post('/:journal', function(req, res, next) {
  var journalId = req.params.journal,
    action = req.body.action,
    pubId = req.body.pub,
    user = req.body.user;
  console.log("I'm here at post request");
  if (action === 'feature') {
    utils.inputAction(journalId, 'featuredUser', pubId, 'feature')
      .then(function(error){
        if (!error) {
          return res.sendStatus(200);
        }
      });
  }
  utils.inputAction(journalId, user, pubId, action)
    .then(function(error) {
      if (!error) {
        res.sendStatus(200);
      }
    }, function(containedAction) {
        res.sendStatus(200);
    });
});


router.get('/:journal', function(req, res, next) {
  console.log("Why am I at get??");
  var journalId = req.params.journal,
    query = req.query.user || req.query.pub;
  if (Object.keys(req.query).length === 0) {
    return res.json({
      error: 'Must specify recommendation by Pub or User'
    });
  }
  var type = Object.keys(req.query)[0] === 'user' ? 'person' : 'thing';
  utils.getRecommendations(journalId, query, type)
    .then(function(recs) {
      res.json({
        recommendations: recs
      });
    }, function(err) {
      res.json({
        error: err
      });
    });
});

router.delete('/:journal', function(req, res, next) {
  var journalId = req.params.journal,
    user = req.body.user,
    pubId = req.body.pub,
    action = req.body.action;
  if (!user && !pubId && action) {
    res.json({
      error: 'Missing user, pub, or action'
    });
  }
  utils.deleteAction(journalId, user, pubId, action)
    .then(function(result) {
      if (!result.err) {
        res.sendStatus(200);
      }
    });
});




module.exports = router;
