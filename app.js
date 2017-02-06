/*jshint esversion: 6 */
(function () {
  'use strict';

  const FCM = require('fcm-push');
  const config = require(__dirname + '/config.json');

  const fcm = new FCM(config.serverKey);
  const express = require('express');
  const bodyParser = require('body-parser');
  const util = require('util');

  const app = express();
  const http = require('http').Server(app);
  const io = require('socket.io')(http);

  const notificationTimers = {};

  function getServer(text) {
    var lines = text.split('\n');
    var server = null;
    for (let i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.indexOf('Host:') > -1) {
        server = line.split(':')[1].trim();
        break;
      }
    }
    return server;
  }

  function handleCritical(data) {
    var server = getServer(data['body-plain']);
    if (server) {
      io.emit('server:critical', {
        server: server
      });
      var subject = data.subject;
      if (!notificationTimers[server]) {
        notificationTimers[server] = setTimeout(() => {
          var body = data['body-plain'];
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
            })
            .catch(function (err) {
              console.error(util.format('Error when sending notification: %s', err));
            });
        }, 300000);
      }
    }
  }

  function handleWarning(data) {
    var server = getServer(data['body-plain']);
    if (server) {
      io.emit('server:warning', {
        server: server
      });
    }
  }

  function handleRecovery(data) {
    var server = getServer(data['body-plain']);
    if (server) {
      io.emit('server:recovery', {
        server: server
      });
      if (notificationTimers[server]) {
        clearTimeout(notificationTimers[server]);
      }
    }
  }

  app.set('port', config.port);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({
    extended: true
  }));

  io.on('connection', (socket) => {
    socket.on('')
  });

  app.post('/alert', (req, res) => {
    var subject = req.body.subject;

    if (subject.indexOf('CRITICAL') > -1) {
      handleCritical(req.body);
    } else if (subject.indexOf('WARNING') > -1) {
      handleWarning(req.body);
    } else if (subject.indexOf('RECOVERY') > -1) {
      handleRecovery(req.body);
    }

    res.send('ok');
  });

  http.listen(config.port, () => {
    console.log(util.format('Listening on port: %s', app.get('port')));
  });

}).call(this);