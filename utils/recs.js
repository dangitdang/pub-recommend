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
    ger.namespace_exists(journal)
      .then(function(value) {
        var now = moment();
        now.add(10, 'y');
        var event = {
          namespace: journal,
          person: user,
          action: action,
          thing: pub,
          expires_at: now.format('YYYY-MM-DD')
        };
        if (value) {
          ger.find_events(journal, {
            person: user,
            thing: pub
          }).then(function(events) {
            if (inputValidation(events, action)) {
              //TODO : Update action based by priority
              console.log("Action: " + action)
              console.log("Already contained: " + mutualExclusives[action])
              return deferred.reject(mutualExclusives[action]);
            }
            ger.events([event]).then(function() {
              return deferred.resolve(null);
            });
          });
        }
        ger.initialize_namespace(journalId).then(function() {
          ger.events([event]).then(function() {
            deferred.resolve(null);
          });
        });
      });
    return deferred.promise;
  },
  getRecommendations: function(journal, user) {
    var deferred = Q.defer();
    ger.namespace_exists(journal)
      .then(function(value) {
        if (!value) {
          return deferred.reject({
            error: 'Journal not found'
          });
        }
        ger.recommendations_for_person(journal, user, {
          actions: config.actions,
          filter_previous_actions: ['read', 'dislike']
        }).then(function(recommendations) {
          //TODO: Add featured pubs and defaults recs
          deferred.resolve(recommendations);
        });
      });
    return deferred.promise;
  },
  deleteAction : function(journal, user, pub, action){
    var deferred = Q.defer();
    ger.delete_events(journal, user, pub, action)
      .then(function(count){
        deferred.resolve(count);
      });
    return deferred.promise;
  }
}
module.exports = Recs;
