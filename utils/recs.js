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
  return event.action;
};
var createMutualExs = function(obj) {
  var dict = obj;
  R.forEach(function(k) {
    dict[k] = obj[k];
  }, R.keys(obj));
  return dict;
};

var mutualExclusives = createMutualExs(config.exclusiveActions);

var inputValidation = function(events, action) {
  var actions = R.map(eventToAction, events);
  var conjugate = mutualExclusives[action];
  if (conjugate) {
    if (R.contains(conjugate, actions)) {
      return false;
    }
  }
  return true;
};

var Recs = {
  inputAction: function(journal, user, pub, action) {
    var deferred = Q.defer();
    ger.namespace_exists(journal)
      .then(function(value) {
        if (value) {
          ger.find_events(journal, {
            person: user,
            thing: pub
          }).then(function(events) {
            if (!inputValidation(events, action)) {
              if (config.exclusiveActions[action]) {
                var toBeRemoved = config.exclusiveActions[action];
                Recs.deleteAction(journal, user, pub, toBeRemoved);
              } else {
                return deferred.reject(mutualExclusives[action]);
              }
            }
            return Recs.insertEvent(journal, user, pub, action)
              .then(function(){
                deferred.resolve(null);
              });
          });
        }
        ger.initialize_namespace(journal).then(function() {
          console.log('initialized namespace');
          Recs.insertEvent(journal, user, pub, action)
            .then(function() {
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
          //TODO: Add featured pubs and defaults rec
          deferred.resolve(recommendations);
        });
      });
    return deferred.promise;
  },
  deleteAction: function(journal, user, pub, action) {
    var deferred = Q.defer();
    console.log('deleting', user, pub, action);
    ger.delete_events(journal, user, pub, action)
      .then(function(count) {
        deferred.resolve(count);
      });
    return deferred.promise;
  },
  insertEvent: function(journal, user, pub, action) {
    var deferred = Q.defer();
    var now = moment();
    now.add(10, 'y');
    var event = {
      namespace: journal,
      person: user,
      action: action,
      thing: pub,
      expires_at: now.format('YYYY-MM-DD')
    };
    console.log('created event');
    ger.events([event]).then(function(){
      console.log('inserted event');
      deferred.resolve(null);
    });
    return deferred.promise;
  }
};
module.exports = Recs;
