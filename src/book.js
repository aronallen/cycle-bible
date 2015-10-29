import Rx from 'rx';
import RxDOM from 'rx-dom';
import _ from 'lodash';
import LZString from 'lz-string';
import names from './names';
import bookNames from './books';

export function name(bookName) {
  return names[(bookName || '').toUpperCase()];
}

export const books = bookNames;

function storageId(name, locale) {
  return name + ':' + locale;
}

function ajax(name, locale) {
  return Rx.DOM.ajax(function(name) {
      return 'data/' + books[name][locale][0] + '.json';
    }(name))
    .map((o) => {
      return o.response;
    })
    .doAction(function(name, locale) {
      return function(chapters) {
        try {
          localStorage[storageId(name, locale)] = LZString.compress(
            chapters);
        } catch (e) {
          console.error(e);
        }
      };
    }(name, locale));
}

export const data = _.memoize(function book(name, locale = 'da_DK') {
  
  return Rx.Observable.just(localStorage[storageId(name, locale)])
    .filter(x => x)
    .map(LZString.decompress)
    .merge(ajax(name, locale))
    .map(JSON.parse)
    .startWith(function(name) {
      var a = [];
      _.times(books[name][locale][1] || 1, a.push.bind(a));
      return a.map(() => {
        return [];
      });
    }(name));
});
