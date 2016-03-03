var g = require('ger');
var config = require('../config.js');
var knex = require('knex')(config.db);
var ems = new g.PsqlESM({
  knex: knex
});
var ger = new g.GER(ems);
var moment = require('moment');
var R = require('ramda');
var Q = require('q');



var eventToAction = function(event) {
  return event.action
}
var createMutualExs = function(obj) {
  var dict = obj
  R.forEach(function(k) {
    dict[k] = obj[k]
  }, R.keys(obj));
  return dict;
}

var mutualExclusives = createMutualExs(config.exclusiveActions);


var inputValidation = function(events, action) {
  var actions = R.map(eventToAction, events)
  var conjugate = mutualExclusives[action]
  if (conjugate) {
    if (R.contains(conjugate, actions)) {
      return false
    }
  }
  return true
}

var Recs = {
    inputAction: function(journal, user, pub, action) {
      var deferred = Q.defer();
      ger.namespace_exists(journalId)
        .then(function(value) {
            var now = moment();
            now.add(10, 'y');
            var event = {
              namespace: journalId,
              person: user,
              action: action,
              thing: pubId,
              expires_at: now.format('YYYY-MM-DD')
            }

            if (value) {
              ger.find_events(journal, {
                person: user,
                thing: pub
              }).then(function(events) {
                if (inputValidation(events, action)) {
                  //TODO : Update action based by priority 
                  deferred.reject(mutualExclusives[action]);
                }
                ger.events([event]).then(function() {
                  deferred.resolve(null);
                });
              });
            }
            ger.initialize_namespace(journalId).then(function() {
              ger.events([event]).then(function() {
                deferred.resolve(null);
              });
            });
          }
      });
      return deferred.promise();
  },
}