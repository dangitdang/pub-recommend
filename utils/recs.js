var g = require('ger');
var config = require('../config.js');
pg.defaults.ssl = true;
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
  var dict = {};
  R.forEach(function(k) {
    dict[k] = obj[k];
    dict[obj[k]] = k;
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

var getFeaturedPubs = function(journal) {
  var deferred = Q.defer();
  ger.find_events(journal,{
    person : 'featuredUser'
  }).then(function(events){
    var features = R.map(function(event){
      return event.thing;
    }, events);
    deferred.resolve(features);
  });
  return deferred.promise;
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
                .then(function() {
                  deferred.resolve(null);
                });
            });
          } else {
            ger.initialize_namespace(journal).then(function() {
              Recs.insertEvent(journal, user, pub, action)
                .then(function() {
                  deferred.resolve(null);
                });
            });
          }
        });
      return deferred.promise;
    },
    getRecommendations: function(journal, query, type) {
      var deferred = Q.defer();
      ger.namespace_exists(journal)
        .then(function(value) {

            if (!value) {
              return deferred.reject({
                error: 'Journal not found'
              });
            }

            var opts = {
              actions: config.actions,
              filter_previous_actions : type === 'person' ? ['read'] : undefined
            };
            ger['recommendations_for_' + type](journal, query, opts)
              .then(function(recs) {
                console.log(recs);
                if (recs.recommendations.length === 0){
                  return getFeaturedPubs(journal).then(function(features){
                    deferred.resolve(features);
                  });
                }
                deferred.resolve(recs);
            });
        });

    return deferred.promise;
  },
  deleteAction: function(journal, user, pub, action) {
    var deferred = Q.defer();
    ger.delete_events(journal, {
        person: user,
        thing: pub,
        action: action
      })
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

    ger.events([event]).then(function() {

      deferred.resolve(null);
    });
    return deferred.promise;
  }
};
module.exports = Recs;
