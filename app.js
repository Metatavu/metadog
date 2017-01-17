/*jshint esversion: 6 */
(function () {
  'use strict';

  const FCM = require('fcm-push');
  const config = require(__dirname + '/config.json');

  const fcm = new FCM(config.serverKey);
  const http = require('http');
  const express = require('express');
  const bodyParser = require('body-parser');
  const util = require('util');

  var app = express();

  app.set('port', config.port);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  app.post('/alert', (req, res) => {
    var subject = req.body.subject;
    if (subject.indexOf('CRITICAL') > -1) {
      var server = null;
      for (let i = 0; i < config.servers.length; i++) {
        if (subject.indexOf(config.servers[i]) > -1) {
          server = config.servers[i];
          break;
        }
      }
      if (server) {
        var body = req.body['body-plain'];
        var message = {
          to: '/topics/onduty',
          data: {
            serverId: server
          },
          notification: {
            title: subject,
            body: body,
            sound: 'missile'
          }
        };

        fcm.send(message)
          .then(function (response) {
            console.log(util.format('Successfully sent notification about server: %s', server));
            res.send('ok');
          })
          .catch(function (err) {
            console.error(util.format('Error when sending notification: %s', err));
            res.send('ok');
          });

      } else {
        res.send('ok');
      }
    }
  });

  http.createServer(app).listen(app.get('port'), function () {
    console.log(util.format('Listening on port: %s', app.get('port')));
  });

}).call(this);