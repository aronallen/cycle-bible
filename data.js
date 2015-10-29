var books = require('./src/books');
var fetch = require('node-fetch');
var _ = require('lodash');
var parseString = require('xml2js').parseString;

var locale = 'da_DK';
_.each(_.pick(books, 'MT'), function (book) {
  var chapters = book[locale][1];
  for (var i = 0; i < 2; i++) {
      fetch('http://old.bibelselskabet.dk/danbib/web/' + book[locale][0] + '/' + i + 'b.htm').then(function (res) {
        if (res.status === 200) {
          res.text().then(function (txt) {
            parseString(txt, function (err, result) {
              console.log(result, err);
            });
          });
        } else {

        }
      });

  }
});
