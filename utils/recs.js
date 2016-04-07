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
var eventToPubID = function(event) {
  return event.thing;
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
  ger.find_events(journal, {
    person: 'featuredUser'
  }).then(function(events) {
    var features = R.map(eventToPubID, events);
    deferred.resolve(features);
  });
  return deferred.promise;
};

var Recs = {
  inputAction: function(journal, user, pub, actions) {
    var deferred = Q.defer();
    ger.namespace_exists(journal)
      .then(function(value) {
        if (value) {
          ger.find_events(journal, {
            person: user,
            thing: pub
          }).then(function(events) {
            var actionsToAdd = [];
            actions.forEach(function(action){
              if (!inputValidation(events, action)) {
                if (config.exclusiveActions[action]) {
                  var toBeRemoved = config.exclusiveActions[action];
                  Recs.deleteAction(journal, user, pub, toBeRemoved);
                  actionsToAdd.push(action);
                }
              } else {
                actionsToAdd.push(action);
              }
            });
            return Recs.insertEvent(journal, user, pub, actionsToAdd)
                        .then(function(){
                          deferred.resolve(null);
                        });
          });
        } else {
          ger.initialize_namespace(journal).then(function() {
            Recs.insertEvent(journal, user, pub, actions)
              .then(function() {
                console.log('im here');
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
          filter_previous_actions: 'read'
        };
        ger['recommendations_for_' + type](journal, query, opts)
          .then(function(recs) {
            getFeaturedPubs(journal).then(function(features) {
              if (type === 'person') {
                ger.find_events(journal, {
                  person: query,
                  action: 'read'
                }).then(function(readPubs) {
                  var readPubsID = R.map(eventToPubID, readPubs);
                  var difference = R.difference(features, readPubsID);
                  var regRecs = R.map(eventToPubID, recs.recommendations);
                  var results = regRecs.concat(difference);
                  deferred.resolve(results);
                });
              }
            });
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
  insertEvent: function(journal, user, pub, actions) {
    var deferred = Q.defer();
    var now = moment();
    now.add(10, 'y');
    var events = [];
    actions.forEach(function(action){
      var event = {
        namespace: journal,
        person: user,
        action: action,
        thing: pub,
        expires_at: now.format('YYYY-MM-DD')
      };
      events.push(event);
    });
    ger.events(events).then(function() {
      deferred.resolve(null);
    });
    return deferred.promise;
  }
};
module.exports = Recs;
