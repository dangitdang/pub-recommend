var router = require('express').Router()
var g = require('ger');
var config = require('../config.js');
var knex = require('knex')(config.db);
var ems = new g.PsqlESM({
    knex: knex
});
var ger = new g.GER(ems);
var moment = require('moment');

/*
	
*/
router.post('/:journal', function(req, res, next) {
    var journalId = req.params.journal,
        action = req.body.action,
        pubId = req.body.pub,
        user = req.body.user;

    ger.namespace_exists(journalId).then(function(value) {
        var now = moment();
        now.add(10, 'y');
        var event = {
            namespace: journalId,
            person: user,
            action: action,
            thing: pubId,
            expires_at: now.format('YYYY-MM-DD')
        }
        if (!value) {
            ger.initialize_namespace(journalId)
                .then(function() {
                    ger.events([event]).then(function() {
                        res.send('ok. initialized new namespace')
                    });
                })
        } else {
            ger.events([event])
                .then(function() {
                    res.send('ok')
                });
        }
    });
});


router.get('/:journal', function(req, res, next){
	var journalId = req.params.journal,
		user = req.query.user;

	ger.namespace_exists(journalId).then(function(value){
		if (!value) {
			return res.json({
				error : 'journalID not found'
			})
		} 
		ger.recommendations_for_person(journalId, user,{
            actions: config.actions,
            filter_previous_actions: ['read','dislike']
        }).then(function(recommendations){
            res.json({
                recommendations : recommendations
            });
        });
	});
});




module.exports = router


ger.find_events('movies', {
    person: 'dangpham',
    thing: 'titanic'
}).then(function(events){
    console.log(events);
})